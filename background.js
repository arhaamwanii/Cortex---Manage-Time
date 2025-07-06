// Background script for synchronized timer
let globalTimer = {
  timeLeft: 25 * 60,
  isRunning: false,
  defaultTime: 25 * 60,
  interval: null
};

// Initialize timer from storage
chrome.storage.sync.get(['timerState', 'timerDuration'], function(result) {
  if (result.timerDuration) {
    globalTimer.defaultTime = result.timerDuration * 60;
  }
  if (result.timerState) {
    globalTimer.timeLeft = result.timerState.timeLeft;
    globalTimer.isRunning = result.timerState.isRunning;
    globalTimer.defaultTime = result.timerState.defaultTime;
    
    // Resume timer if it was running
    if (globalTimer.isRunning) {
      startGlobalTimer();
    }
  } else {
    globalTimer.timeLeft = globalTimer.defaultTime;
  }
});

// Start the global timer
function startGlobalTimer() {
  if (globalTimer.interval) return;
  
  globalTimer.isRunning = true;
  globalTimer.interval = setInterval(() => {
    globalTimer.timeLeft--;
    
    // Broadcast to all tabs
    broadcastTimerUpdate();
    
    // Save state
    saveTimerState();
    
    if (globalTimer.timeLeft <= 0) {
      stopGlobalTimer();
      // Notify completion
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'timerComplete'
          }).catch(() => {}); // Ignore errors for inactive tabs
        });
      });
    }
  }, 1000);
}

// Stop the global timer
function stopGlobalTimer() {
  globalTimer.isRunning = false;
  if (globalTimer.interval) {
    clearInterval(globalTimer.interval);
    globalTimer.interval = null;
  }
  saveTimerState();
}

// Reset the global timer
function resetGlobalTimer() {
  stopGlobalTimer();
  globalTimer.timeLeft = globalTimer.defaultTime;
  broadcastTimerUpdate();
  saveTimerState();
}

// Broadcast timer update to all tabs
function broadcastTimerUpdate() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateTimerDisplay',
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning
      }).catch(() => {}); // Ignore errors for inactive tabs
    });
  });
}

// Save timer state to storage
function saveTimerState() {
  chrome.storage.sync.set({
    timerState: {
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      defaultTime: globalTimer.defaultTime
    }
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'getTimerState':
      sendResponse({
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        defaultTime: globalTimer.defaultTime
      });
      break;
      
    case 'startTimer':
      startGlobalTimer();
      broadcastTimerUpdate();
      break;
      
    case 'stopTimer':
      stopGlobalTimer();
      broadcastTimerUpdate();
      break;
      
    case 'resetTimer':
      resetGlobalTimer();
      break;
      
    case 'updateDuration':
      globalTimer.defaultTime = request.duration * 60;
      resetGlobalTimer();
      break;
  }
});

// Clean up when browser closes
chrome.runtime.onSuspend.addListener(function() {
  saveTimerState();
});