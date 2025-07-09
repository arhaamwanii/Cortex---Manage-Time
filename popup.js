// Elevate Popup Controller - Full Timer Control Interface
console.log('POPUP.JS: Script loaded and executing');

// State variables
let timerEnabled = null;
let newtabEnabled = null;
let currentTimerState = null;
let currentTask = '';

document.addEventListener('DOMContentLoaded', function() {
    console.log('POPUP.JS: DOM loaded, initializing comprehensive controls...');
    loadCurrentState();
    setupEventListeners();
    setupExtensionsLink();
    
    // Poll state every 2 seconds to stay synced
    setInterval(() => {
        loadCurrentState();
    }, 2000);
});

function setupExtensionsLink() {
    const isBrave = navigator.userAgent.includes('Brave');
    const extensionsUrl = isBrave ? 'brave://extensions' : 'chrome://extensions';
    const link = document.getElementById('extensionsLink');
    link.href = extensionsUrl;
    link.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.tabs.create({ url: extensionsUrl });
        window.close();
    });
}

function loadCurrentState() {
    console.log('POPUP.JS: Loading current state from background...');
    // Get timer state from background
    chrome.runtime.sendMessage({ action: 'getTimerState' }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error getting timer state:', chrome.runtime.lastError);
            // Try to restart background script
            setTimeout(() => {
                console.log('POPUP.JS: Retrying state load after error...');
                loadCurrentState();
            }, 1000);
            return;
        }
        
        if (response) {
            console.log('POPUP.JS: Received timer state:', response);
            currentTimerState = response;
            timerEnabled = response.enabled;
            currentTask = response.currentTask || '';
            
            updateTimerDisplay(response);
            updateTimerToggle();
            updateTaskDisplay();
            updateDurationInput(response.defaultTime);
        } else {
            console.warn('POPUP.JS: No response from background script');
        }
    });

    // Get new tab state from storage
    chrome.storage.sync.get(['newtabEnabled'], function(result) {
        // CRITICAL FIX: Use explicit boolean check like other files
        console.log('POPUP.JS: Loaded newtab state:', result.newtabEnabled);
        if (result.newtabEnabled === true || result.newtabEnabled === false) {
            newtabEnabled = result.newtabEnabled;
        } else {
            newtabEnabled = true; // Default to true
        }
        console.log('POPUP.JS: Set newtabEnabled to:', newtabEnabled);
        updateNewtabToggle();
    });
}

function updateTimerDisplay(state) {
    const display = document.getElementById('timerDisplay');
    const status = document.getElementById('timerStatus');
    const startStopBtn = document.getElementById('startStopBtn');
    const modeBtn = document.getElementById('modeBtn');
    
    // Update timer display
    const minutes = Math.floor(Math.abs(state.timeLeft) / 60);
    const seconds = Math.abs(state.timeLeft) % 60;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update status text
    const modeText = state.mode === 'pomodoro' ? 'Pomodoro Mode' : 'Stopwatch Mode';
    const runningText = state.isRunning ? 'Running' : 'Paused';
    status.textContent = `${modeText} • ${runningText}`;
    
    // Update start/stop button
    startStopBtn.textContent = state.isRunning ? 'Pause' : 'Start';
    startStopBtn.className = `timer-btn ${state.isRunning ? '' : 'primary'}`;
    
    // Update mode button
    modeBtn.textContent = state.mode === 'pomodoro' ? 'Stopwatch' : 'Pomodoro';
}

function updateTaskDisplay() {
    const taskDisplay = document.getElementById('currentTask');
    const taskInput = document.getElementById('taskInput');
    
    if (currentTask && currentTask.trim()) {
        taskDisplay.textContent = currentTask;
        taskDisplay.className = 'current-task';
        taskInput.value = currentTask;
    } else {
        taskDisplay.textContent = 'No task set';
        taskDisplay.className = 'current-task empty';
        taskInput.value = '';
    }
}

function updateDurationInput(defaultTime) {
    const durationInput = document.getElementById('durationInput');
    durationInput.value = Math.round(defaultTime / 60);
}

function setupEventListeners() {
    console.log('POPUP.JS: Setting up comprehensive event listeners');
    
    // Toggle switches
    document.getElementById('timerToggle').addEventListener('click', toggleTimer);
    document.getElementById('newtabToggle').addEventListener('click', toggleNewtab);
    
    // Timer controls
    document.getElementById('startStopBtn').addEventListener('click', toggleTimerRunning);
    document.getElementById('resetBtn').addEventListener('click', resetTimer);
    document.getElementById('modeBtn').addEventListener('click', switchMode);
    
    // Task management
    const taskInput = document.getElementById('taskInput');
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setTask();
        }
    });
    taskInput.addEventListener('blur', setTask);
    
    // Duration setting
    const durationInput = document.getElementById('durationInput');
    durationInput.addEventListener('change', setDuration);
    durationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setDuration();
        }
    });
}

// Timer control functions
function toggleTimerRunning() {
    if (!currentTimerState) return;
    
    const action = currentTimerState.isRunning ? 'stopTimer' : 'startTimer';
    console.log('POPUP.JS: Toggling timer running state:', action);
    
    chrome.runtime.sendMessage({ action: action }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling timer:', chrome.runtime.lastError);
        }
    });
}

function resetTimer() {
    console.log('POPUP.JS: Resetting timer');
    chrome.runtime.sendMessage({ action: 'resetTimer' }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error resetting timer:', chrome.runtime.lastError);
        }
    });
}

function switchMode() {
    console.log('POPUP.JS: Switching timer mode');
    chrome.runtime.sendMessage({ action: 'switchMode' }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error switching mode:', chrome.runtime.lastError);
        }
    });
}

function setTask() {
    const taskInput = document.getElementById('taskInput');
    const newTask = taskInput.value.trim();
    
    if (newTask !== currentTask) {
        console.log('POPUP.JS: Setting task:', newTask);
        currentTask = newTask;
        
        chrome.runtime.sendMessage({ 
            action: 'setTask', 
            task: newTask 
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('POPUP.JS: Error setting task:', chrome.runtime.lastError);
            } else {
                updateTaskDisplay();
            }
        });
    }
}

function setDuration() {
    const durationInput = document.getElementById('durationInput');
    const minutes = parseInt(durationInput.value);
    
    if (minutes && minutes >= 1 && minutes <= 90) {
        console.log('POPUP.JS: Setting duration:', minutes, 'minutes');
        chrome.runtime.sendMessage({ 
            action: 'updateDuration', 
            duration: minutes 
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.error('POPUP.JS: Error setting duration:', chrome.runtime.lastError);
            }
        });
    } else {
        // Reset to current value if invalid
        if (currentTimerState) {
            durationInput.value = Math.round(currentTimerState.defaultTime / 60);
        }
    }
}

// Toggle functions (existing functionality)
function toggleTimer() {
    if (timerEnabled === null) {
        console.log('POPUP.JS: Timer state not loaded yet, forcing reload...');
        loadCurrentState();
        return;
    }
    
    const newState = !timerEnabled;
    console.log('POPUP.JS: Toggling floating timer from', timerEnabled, 'to', newState);
    
    // Show immediate feedback
    const originalState = timerEnabled;
    timerEnabled = newState;
    updateTimerToggle();
    
    console.log('POPUP.JS: Sending toggleEnabled message...');
    chrome.runtime.sendMessage({ 
        action: 'toggleEnabled', 
        enabled: timerEnabled,
        source: 'popupToggle'
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling timer:', chrome.runtime.lastError);
            // Revert on error
            timerEnabled = originalState;
            updateTimerToggle();
            // Try to reconnect
            setTimeout(() => {
                console.log('POPUP.JS: Retrying after toggle error...');
                loadCurrentState();
            }, 1000);
            return;
        }
        
        console.log('POPUP.JS: Toggle response:', response);
        if (response && response.success) {
            // Update immediately with the response
            timerEnabled = response.enabled;
            updateTimerToggle();
        }
        // Also reload state after toggle for completeness
        setTimeout(loadCurrentState, 300);
    });
}

function toggleNewtab() {
    if (newtabEnabled === null) {
        console.log('POPUP.JS: New tab state not loaded yet, ignoring click');
        return;
    }
    
    const newState = !newtabEnabled;
    console.log('POPUP.JS: Toggling new tab from', newtabEnabled, 'to', newState);
    
    // Show immediate feedback
    const originalState = newtabEnabled;
    newtabEnabled = newState;
    updateNewtabToggle();
    
    // Only send message to background - let background handle storage
    chrome.runtime.sendMessage({ 
        action: 'toggleNewtab', 
        enabled: newtabEnabled 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling new tab:', chrome.runtime.lastError);
            // Revert on error
            newtabEnabled = originalState;
            updateNewtabToggle();
            return;
        }
        console.log('POPUP.JS: New tab toggle response:', response);
        if (response && response.success !== undefined) {
            // Update with response from background
            newtabEnabled = response.enabled;
            updateNewtabToggle();
        }
    });
}

function updateTimerToggle() {
    const toggle = document.getElementById('timerToggle');
    const status = document.getElementById('timerStatus');
    const statusText = document.getElementById('timerStatusText');
    
    if (timerEnabled === null) {
        statusText.textContent = 'Syncing...';
        return;
    }
    
    if (timerEnabled) {
        toggle.classList.add('active');
        status.classList.add('active');
        statusText.textContent = 'Active';
    } else {
        toggle.classList.remove('active');
        status.classList.remove('active');
        statusText.textContent = 'Disabled';
    }
}

function updateNewtabToggle() {
    const toggle = document.getElementById('newtabToggle');
    const status = document.getElementById('newtabStatus');
    const statusText = document.getElementById('newtabStatusText');
    
    if (newtabEnabled === null) {
        statusText.textContent = 'Loading...';
        return;
    }
    
    if (newtabEnabled) {
        toggle.classList.add('active');
        status.classList.add('active');
        statusText.textContent = 'Active';
    } else {
        toggle.classList.remove('active');
        status.classList.remove('active');
        statusText.textContent = 'Disabled';
    }
}

// Force state reset mechanism
function forceStateReset() {
    console.log('POPUP.JS: Requesting force state reset from background');
    chrome.runtime.sendMessage({ action: 'forceStateReset' });
    setTimeout(loadCurrentState, 500);
} 