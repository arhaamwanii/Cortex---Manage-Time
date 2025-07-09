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
    const taskInput = document.getElementById('taskInput');
    const taskBtn = document.getElementById('taskBtn');
    
    if (currentTask && currentTask.trim()) {
        taskInput.value = currentTask;
        taskBtn.textContent = 'Change Task';
    } else {
        taskInput.value = '';
        taskBtn.textContent = 'Add Task';
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
    
    // Toggle cards for easier clicking
    document.getElementById('timerCard').addEventListener('click', function(e) {
        if (e.target.closest('.toggle-switch')) return; // Don't double-trigger
        toggleTimer();
    });
    document.getElementById('newtabCard').addEventListener('click', function(e) {
        if (e.target.closest('.toggle-switch')) return; // Don't double-trigger
        toggleNewtab();
    });
    
    // Timer controls
    document.getElementById('startStopBtn').addEventListener('click', toggleTimerRunning);
    document.getElementById('resetBtn').addEventListener('click', resetTimer);
    document.getElementById('modeBtn').addEventListener('click', switchMode);
    
    // Task management
    const taskInput = document.getElementById('taskInput');
    const taskBtn = document.getElementById('taskBtn');
    
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setTask();
        }
    });
    
    taskBtn.addEventListener('click', setTask);
    
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

function setDuration() {
    const durationInput = document.getElementById('durationInput');
    const minutes = parseInt(durationInput.value);
    
    if (isNaN(minutes) || minutes < 1 || minutes > 90) {
        console.error('POPUP.JS: Invalid duration:', minutes);
        return;
    }
    
    console.log('POPUP.JS: Setting duration:', minutes, 'minutes');
    const seconds = minutes * 60;
    
    chrome.runtime.sendMessage({ 
        action: 'updateDuration', 
        duration: minutes 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error setting duration:', chrome.runtime.lastError);
        }
    });
}

function toggleTimer() {
    console.log('POPUP.JS: Toggling floating timer. Current state:', timerEnabled);
    
    const newEnabled = !timerEnabled;
    console.log('POPUP.JS: Setting floating timer to:', newEnabled);
    
    chrome.runtime.sendMessage({ 
        action: 'toggleEnabled', 
        enabled: newEnabled,
        source: 'popupToggle'
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling timer:', chrome.runtime.lastError);
        } else {
            console.log('POPUP.JS: Timer toggle response:', response);
            timerEnabled = newEnabled;
            updateTimerToggle();
        }
    });
}

function toggleNewtab() {
    console.log('POPUP.JS: Toggling new tab override. Current state:', newtabEnabled);
    
    const newEnabled = !newtabEnabled;
    console.log('POPUP.JS: Setting new tab override to:', newEnabled);
    
    chrome.storage.sync.set({ newtabEnabled: newEnabled }, function() {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error setting newtab state:', chrome.runtime.lastError);
        } else {
            console.log('POPUP.JS: Successfully set newtab state to:', newEnabled);
            newtabEnabled = newEnabled;
            updateNewtabToggle();
        }
    });
}

function updateTimerToggle() {
    const toggle = document.getElementById('timerToggle');
    const card = document.getElementById('timerCard');
    const statusDot = document.getElementById('timerStatusDot');
    const statusText = document.getElementById('timerStatusText');
    
    console.log('POPUP.JS: Updating timer toggle UI. Enabled:', timerEnabled);
    
    if (timerEnabled) {
        toggle.classList.add('active');
        card.classList.add('active');
        statusDot.classList.add('active');
        statusText.textContent = 'Active';
    } else {
        toggle.classList.remove('active');
        card.classList.remove('active');
        statusDot.classList.remove('active');
        statusText.textContent = 'Disabled';
    }
}

function updateNewtabToggle() {
    const toggle = document.getElementById('newtabToggle');
    const card = document.getElementById('newtabCard');
    const statusDot = document.getElementById('newtabStatusDot');
    const statusText = document.getElementById('newtabStatusText');
    
    console.log('POPUP.JS: Updating newtab toggle UI. Enabled:', newtabEnabled);
    
    if (newtabEnabled) {
        toggle.classList.add('active');
        card.classList.add('active');
        statusDot.classList.add('active');
        statusText.textContent = 'Active';
    } else {
        toggle.classList.remove('active');
        card.classList.remove('active');
        statusDot.classList.remove('active');
        statusText.textContent = 'Disabled';
    }
}

// Emergency function to force state reset
function forceStateReset() {
    console.log('POPUP.JS: Force resetting all states');
    chrome.runtime.sendMessage({ action: 'forceStateReset' });
} 