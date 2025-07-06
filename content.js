// Pomodoro Timer Content Script - Display Layer Only
let timerElement = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentPosition = { x: 20, y: 20 }; // Default position
const currentDomain = window.location.hostname;

// Initialize timer
function init() {
  loadPosition();
  createTimerElement();
  requestTimerState();
}

// Load saved position for this domain
function loadPosition() {
  chrome.storage.sync.get([`position_${currentDomain}`], function(result) {
    if (result[`position_${currentDomain}`]) {
      currentPosition = result[`position_${currentDomain}`];
    }
  });
}

// Save position for this domain
function savePosition() {
  chrome.storage.sync.set({
    [`position_${currentDomain}`]: currentPosition
  });
}

// Request timer state from background
function requestTimerState() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    if (response && timerElement) {
      updateDisplay(response.timeLeft);
      updateStartButton(response.isRunning);
      updateTaskDisplay(response.currentTask, response.isRunning);
      
      // Show/hide timer based on enabled state
      timerElement.style.display = response.enabled ? 'block' : 'none';
    }
  });
}

// Create the floating timer element
function createTimerElement() {
  if (timerElement) return;
  
  timerElement = document.createElement('div');
  timerElement.id = 'pomodoro-timer';
  timerElement.className = 'pomodoro-timer';
  timerElement.style.top = currentPosition.y + 'px';
  timerElement.style.right = currentPosition.x + 'px';
  
  // Create timer display
  const display = document.createElement('div');
  display.className = 'timer-display';
  display.textContent = '25:00'; // Will be updated by background script
  
  // Create controls (hidden by default)
  const controls = document.createElement('div');
  controls.className = 'timer-controls';
  
  const startBtn = document.createElement('button');
  startBtn.className = 'start-btn';
  startBtn.textContent = 'Start';
  startBtn.onclick = toggleTimer;
  
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = resetTimer;
  
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = 'Set';
  settingsBtn.onclick = showSettings;

  const taskBtn = document.createElement('button');
  taskBtn.textContent = 'Task';
  taskBtn.id = 'taskBtn';
  taskBtn.onclick = showTaskPrompt;
  
  controls.appendChild(startBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(settingsBtn);
  controls.appendChild(taskBtn);
  
  timerElement.appendChild(display);
  timerElement.appendChild(controls);
  
  // Create task display
  const taskDisplay = document.createElement('div');
  taskDisplay.className = 'task-display';
  timerElement.appendChild(taskDisplay);
  
  // Make draggable
  setupDragging();
  
  // Show controls on hover
  timerElement.onmouseenter = () => {
    if (!isDragging) {
      controls.style.display = 'flex';
    }
  };
  
  timerElement.onmouseleave = () => {
    if (!isDragging) {
      controls.style.display = 'none';
    }
  };
  
  document.body.appendChild(timerElement);
}

// Setup dragging functionality
function setupDragging() {
  timerElement.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function startDrag(e) {
  // Don't drag if clicking on buttons
  if (e.target.tagName === 'BUTTON') return;
  
  isDragging = true;
  timerElement.style.cursor = 'grabbing';
  
  const rect = timerElement.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  
  // Hide controls while dragging
  const controls = timerElement.querySelector('.timer-controls');
  controls.style.display = 'none';
  
  e.preventDefault();
}

function drag(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  
  const newX = window.innerWidth - (e.clientX - dragOffset.x + timerElement.offsetWidth);
  const newY = e.clientY - dragOffset.y;
  
  // Keep within viewport bounds
  const maxX = window.innerWidth - timerElement.offsetWidth;
  const maxY = window.innerHeight - timerElement.offsetHeight;
  
  currentPosition.x = Math.max(0, Math.min(maxX, window.innerWidth - (e.clientX - dragOffset.x + timerElement.offsetWidth)));
  currentPosition.y = Math.max(0, Math.min(maxY, newY));
  
  timerElement.style.right = currentPosition.x + 'px';
  timerElement.style.top = currentPosition.y + 'px';
}

function stopDrag() {
  if (!isDragging) return;
  
  isDragging = false;
  timerElement.style.cursor = 'grab';
  
  // Save position
  savePosition();
}

// Format time as MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Toggle timer start/stop
function toggleTimer() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    if (response.isRunning) {
      chrome.runtime.sendMessage({action: 'stopTimer'});
    } else {
      chrome.runtime.sendMessage({action: 'startTimer'});
    }
  });
}

// Reset timer
function resetTimer() {
  chrome.runtime.sendMessage({action: 'resetTimer'});
}

// Update timer display
function updateDisplay(timeLeft) {
  if (!timerElement) return;
  const display = timerElement.querySelector('.timer-display');
  display.textContent = formatTime(timeLeft);
}

// Update start button text
function updateStartButton(isRunning) {
  if (!timerElement) return;
  const startBtn = timerElement.querySelector('.start-btn');
  startBtn.textContent = isRunning ? 'Pause' : 'Start';
}

// Update task display
function updateTaskDisplay(task, isRunning) {
  if (!timerElement) return;
  const taskDisplay = timerElement.querySelector('.task-display');
  const taskBtn = timerElement.querySelector('#taskBtn');

  if (task) {
    taskDisplay.textContent = task;
    taskDisplay.style.display = 'block';
  } else {
    taskDisplay.style.display = 'none';
  }

  if (taskBtn) {
    taskBtn.disabled = isRunning;
    if(isRunning) {
        taskBtn.style.opacity = '0.5';
        taskBtn.style.cursor = 'not-allowed';
    } else {
        taskBtn.style.opacity = '1';
        taskBtn.style.cursor = 'pointer';
    }
  }
}

// Show settings prompt
function showSettings() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    const currentMinutes = Math.floor(response.timeLeft / 60);
    const minutes = prompt('Set timer duration (minutes):', currentMinutes);
    if (minutes && !isNaN(minutes) && minutes > 0) {
      chrome.runtime.sendMessage({
        action: 'updateDuration',
        duration: parseInt(minutes)
      });
    }
  });
}

function showTaskPrompt() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
      if (response && !response.isRunning) {
          const task = prompt('What are you working on?', response.currentTask || '');
          if (task !== null) { 
              chrome.runtime.sendMessage({action: 'setTask', task: task});
          }
      } else {
          alert('You cannot change the task while the timer is running.');
      }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'updateTimerDisplay':
      updateDisplay(request.timeLeft);
      updateStartButton(request.isRunning);
      updateTaskDisplay(request.currentTask, request.isRunning);
      
      // Show/hide timer based on enabled state
      if (timerElement) {
        timerElement.style.display = request.enabled ? 'block' : 'none';
      }
      break;
      
    case 'timerComplete':
      // Timer completed notification - only request permission when needed
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('CORTEX Timer', {
              body: 'Time is up! Take a break.',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>'
            });
          }
        });
      } else if (Notification.permission === 'granted') {
        new Notification('CORTEX Timer', {
          body: 'Time is up! Take a break.',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>'
        });
      }
      break;
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Only request notification permission when timer completes, not on every page load