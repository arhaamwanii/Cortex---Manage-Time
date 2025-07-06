// Pomodoro Timer Content Script - Display Layer Only
let timerElement = null;
let reEnableDot = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentPosition = null; // Set to null initially
const currentDomain = window.location.hostname;

// Initialize timer
function init() {
  createTimerElement(); // Create it first
  loadPosition();       // Then load and apply the correct position
  requestTimerState();
}

// Load saved position for this domain
function loadPosition() {
  chrome.storage.sync.get([`position_${currentDomain}`], function(result) {
    if (result[`position_${currentDomain}`]) {
      currentPosition = result[`position_${currentDomain}`];
    } else {
      // Set default position to the middle of the right side of the screen
      currentPosition = { x: 20, y: window.innerHeight / 2 };
    }
    
    // Apply the position
    if (timerElement) {
        // Adjust for element height to truly center it
        const rect = timerElement.getBoundingClientRect();
        timerElement.style.top = (currentPosition.y - (rect.height / 2)) + 'px';
        timerElement.style.right = currentPosition.x + 'px';
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
      updateDisplay(response.timeLeft, response.mode);
      updateStartButton(response.isRunning);
      updateTaskDisplay(response.currentTask, response.isRunning, response.mode);
      updateStopwatchDisplay(response.stopwatch);
      updateFrequencyControls(response.reminderFrequency, response.currentTask);
      
      // Show/hide timer based on enabled state
      if (response.enabled) {
        timerElement.style.display = 'block';
        reEnableDot.style.display = 'none';
      } else {
        timerElement.style.display = 'none';
        reEnableDot.style.display = 'block';
      }
    }
  });
}

// Create the floating timer element
function createTimerElement() {
  if (timerElement) return;
  
  timerElement = document.createElement('div');
  timerElement.id = 'pomodoro-timer';
  timerElement.className = 'pomodoro-timer';
  
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
  startBtn.title = 'Start/Pause Timer';
  startBtn.onclick = toggleTimer;
  
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset Timer';
  resetBtn.onclick = resetTimer;
  
  const settingsBtn = document.createElement('button');
  settingsBtn.textContent = 'Set';
  settingsBtn.title = 'Set Duration';
  settingsBtn.onclick = showSettings;

  const taskBtn = document.createElement('button');
  taskBtn.textContent = 'Task';
  taskBtn.id = 'taskBtn';
  taskBtn.title = 'Set Current Task';
  taskBtn.onclick = showTaskPrompt;

  const switchModeBtn = document.createElement('button');
  switchModeBtn.id = 'switchModeBtn';
  switchModeBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'switchMode' });
  };
  
  controls.appendChild(startBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(settingsBtn);
  controls.appendChild(taskBtn);
  controls.appendChild(switchModeBtn);
  
  timerElement.appendChild(display);
  timerElement.appendChild(controls);
  
  // Create task display
  const taskDisplay = document.createElement('div');
  taskDisplay.className = 'task-display';
  timerElement.appendChild(taskDisplay);
  
  // Create stopwatch display
  const stopwatchDisplay = document.createElement('div');
  stopwatchDisplay.className = 'stopwatch-display';
  timerElement.appendChild(stopwatchDisplay);
  
  // Create frequency controls
  const freqControls = document.createElement('div');
  freqControls.className = 'freq-controls';
  freqControls.innerHTML = `
    <span class="freq-label">Reminder:</span>
    <button class="arrow-btn" id="freq-down" title="Less Frequent">&minus;</button>
    <span id="freq-value">2 min</span>
    <button class="arrow-btn" id="freq-up" title="More Frequent">&plus;</button>
  `;
  timerElement.appendChild(freqControls);
  
  // Add reminder indicator dot
  const reminderIndicator = document.createElement('div');
  reminderIndicator.className = 'reminder-indicator';
  reminderIndicator.title = 'Reminders are active';
  timerElement.appendChild(reminderIndicator);
  
  // Add close button
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Minimize Timer';
  closeBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled: false });
  };
  timerElement.appendChild(closeBtn);
  
  // Make draggable
  setupDragging();
  
  // Add event listeners for frequency controls
  timerElement.querySelector('#freq-down').addEventListener('click', () => adjustFrequency(-1));
  timerElement.querySelector('#freq-up').addEventListener('click', () => adjustFrequency(1));
  
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
  createReEnableDot();
}

// Create the dot to re-enable the timer
function createReEnableDot() {
  if (reEnableDot) return;
  reEnableDot = document.createElement('div');
  reEnableDot.className = 're-enable-dot';
  reEnableDot.title = 'Show Timer';
  reEnableDot.style.display = 'none'; // Hidden by default
  
  reEnableDot.onclick = () => {
    chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled: true });
  };

  document.body.appendChild(reEnableDot);
  setupDotDragging(reEnableDot);
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

function setupDotDragging(dot) {
    let isDotDragging = false;
    let dotDragOffset = { y: 0 };

    dot.addEventListener('mousedown', (e) => {
        isDotDragging = true;
        dot.style.cursor = 'grabbing';
        dotDragOffset.y = e.clientY - dot.getBoundingClientRect().top;
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDotDragging) return;
        let newY = e.clientY - dotDragOffset.y;
        const maxY = window.innerHeight - dot.offsetHeight;
        newY = Math.max(0, Math.min(newY, maxY));
        dot.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!isDotDragging) return;
        isDotDragging = false;
        dot.style.cursor = 'pointer';
    });
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
function updateDisplay(timeLeft, mode) {
  if (!timerElement) return;
  const display = timerElement.querySelector('.timer-display');
  const switchModeBtn = timerElement.querySelector('#switchModeBtn');

  display.textContent = formatTime(timeLeft);

  if (mode === 'stopwatch') {
      timerElement.classList.add('stopwatch-mode');
      if(switchModeBtn) {
          switchModeBtn.textContent = 'To Timer';
          switchModeBtn.title = 'Switch to Timer';
      }
  } else {
      timerElement.classList.remove('stopwatch-mode');
      if(switchModeBtn) {
          switchModeBtn.textContent = 'To Stopwatch';
          switchModeBtn.title = 'Switch to Stopwatch';
      }
  }
}

// Update start button text
function updateStartButton(isRunning) {
  if (!timerElement) return;
  const startBtn = timerElement.querySelector('.start-btn');
  startBtn.textContent = isRunning ? 'Pause' : 'Start';
}

// Update stopwatch display
function updateStopwatchDisplay(stopwatch) {
    if (!timerElement) return;
    const stopwatchDisplay = timerElement.querySelector('.stopwatch-display');
    if (stopwatch && stopwatch.isRunning) {
        stopwatchDisplay.textContent = '⏱️ ' + formatTime(stopwatch.time);
        stopwatchDisplay.style.display = 'block';
    } else {
        stopwatchDisplay.style.display = 'none';
    }
}

// Update frequency controls
function updateFrequencyControls(frequency, task) {
  if (!timerElement) return;
  const freqControls = timerElement.querySelector('.freq-controls');
  const freqValue = timerElement.querySelector('#freq-value');
  const reminderIndicator = timerElement.querySelector('.reminder-indicator');

  if (task) {
    freqValue.textContent = `${frequency} min`;
    if (frequency > 0) {
        reminderIndicator.style.display = 'block';
    } else {
        reminderIndicator.style.display = 'none';
    }
  } else {
    freqControls.style.display = 'none';
    reminderIndicator.style.display = 'none';
  }
}

// Update task display
function updateTaskDisplay(task, isRunning, mode) {
  if (!timerElement) return;
  const taskDisplay = timerElement.querySelector('.task-display');
  const taskBtn = timerElement.querySelector('#taskBtn');
  const settingsBtn = timerElement.querySelector('[title="Set Duration"]');

  if (task) {
    taskDisplay.textContent = task;
    taskDisplay.style.display = 'block';
  } else {
    taskDisplay.style.display = 'none';
  }
  
  if(settingsBtn) {
    settingsBtn.style.display = mode === 'pomodoro' ? 'inline-block' : 'none';
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

function adjustFrequency(change) {
    chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
        if (response) {
            let newFreq = response.reminderFrequency + change;
            if (newFreq < 0) newFreq = 0; // Minimum 0 minutes
            if (newFreq > 60) newFreq = 60; // Maximum 60 minutes
            chrome.runtime.sendMessage({ action: 'updateReminderFrequency', frequency: newFreq });
        }
    });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'updateTimerDisplay':
      updateDisplay(request.timeLeft, request.mode);
      updateStartButton(request.isRunning);
      updateTaskDisplay(request.currentTask, request.isRunning, request.mode);
      updateStopwatchDisplay(request.stopwatch);
      updateFrequencyControls(request.reminderFrequency, request.currentTask);
      
      // Show/hide timer based on enabled state
      if (timerElement && reEnableDot) {
        if (request.enabled) {
          timerElement.style.display = 'block';
          reEnableDot.style.display = 'none';
        } else {
          timerElement.style.display = 'none';
          reEnableDot.style.display = 'block';
        }
      }
      break;
      
    case 'remindTask':
      if (timerElement) {
        const taskDisplay = timerElement.querySelector('.task-display');
        if (taskDisplay && taskDisplay.textContent) {
          playReminderSound();
          taskDisplay.classList.add('task-glow');
          setTimeout(() => {
            taskDisplay.classList.remove('task-glow');
          }, 2000); // Glow for 2 seconds
        }
      }
      break;

    case 'timerComplete':
      // Play a sound
      playSound();
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

// Function to play a sound without audio files
function playSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Sound characteristics
  oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

  // Play and stop the sound
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.5); // Play for 0.5 seconds
}

function playReminderSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Sound characteristics - softer and shorter
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Very low volume

  // Play and stop the sound
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.15); // Play for 0.15 seconds
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Only request notification permission when timer completes, not on every page load