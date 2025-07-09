// Elevate Popup Controller - Full Timer Control Interface
console.log('POPUP.JS: Script loaded and executing');

// State variables
let timerEnabled = null;
let newtabEnabled = null;
let currentTimerState = null;
let currentTask = '';
let isUserEditingTask = false; // Track if user is actively editing the task input
let isEditingTimer = false; // Track if user is editing timer

document.addEventListener('DOMContentLoaded', function() {
    console.log('POPUP.JS: DOM loaded, initializing comprehensive controls...');
    loadCurrentState();
    setupEventListeners();
    
    // Poll state every 1 second to stay synced
    setInterval(() => {
        loadCurrentState();
    }, 1000);
    
    // PAGE VISIBILITY API: Handle popup becoming active again after any suspension
    console.log('POPUP.JS: Setting up page visibility listeners for activation detection');
    
    // Listen for visibility changes (primary method)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('POPUP.JS: Popup became visible - refreshing timer state');
            loadCurrentState();
        }
    });
    
    // Listen for window focus (backup method)
    window.addEventListener('focus', function() {
        console.log('POPUP.JS: Popup gained focus - refreshing timer state');
        loadCurrentState();
    });
});

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
            updateStopwatchInfo(response.mode);
            updateTimerControls(response.isRunning);
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
    
    // Only update display if not editing
    if (!isEditingTimer) {
        const minutes = Math.floor(Math.abs(state.timeLeft) / 60);
        const seconds = Math.abs(state.timeLeft) % 60;
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
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
    
    // Only update the input if user is not actively editing it
    if (!isUserEditingTask) {
        if (currentTask && currentTask.trim()) {
            taskInput.value = currentTask;
            taskBtn.textContent = 'Change Task';
        } else {
            taskInput.value = '';
            taskBtn.textContent = 'Add Task';
        }
    } else {
        // User is editing, just update the button text based on current state
        taskBtn.textContent = currentTask && currentTask.trim() ? 'Change Task' : 'Add Task';
    }
}

function updateStopwatchInfo(mode) {
    const stopwatchInfo = document.getElementById('stopwatchInfo');
    if (mode === 'stopwatch') {
        stopwatchInfo.classList.add('visible');
    } else {
        stopwatchInfo.classList.remove('visible');
    }
}

function updateTimerControls(isRunning) {
    const decreaseBtn = document.getElementById('decreaseTimerBtn');
    const increaseBtn = document.getElementById('increaseTimerBtn');
    
    // Show +/- buttons only when timer is not running
    if (!isRunning) {
        decreaseBtn.classList.add('visible');
        increaseBtn.classList.add('visible');
    } else {
        decreaseBtn.classList.remove('visible');
        increaseBtn.classList.remove('visible');
    }
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
    
    // Timer display editing
    const timerDisplay = document.getElementById('timerDisplay');
    const timerInput = document.getElementById('timerInput');
    
    timerDisplay.addEventListener('click', function() {
        if (!currentTimerState || currentTimerState.isRunning) return; // Don't edit when running
        startTimerEditing();
    });
    
    timerInput.addEventListener('blur', function() {
        finishTimerEditing();
    });
    
    timerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            finishTimerEditing();
        }
    });
    
    // Timer increment/decrement buttons - Remove lag with immediate feedback
    document.getElementById('increaseTimerBtn').addEventListener('click', function() {
        adjustTimerImmediate(1);
    });
    
    document.getElementById('decreaseTimerBtn').addEventListener('click', function() {
        adjustTimerImmediate(-1);
    });
    
    // Task management with editing tracking
    const taskInput = document.getElementById('taskInput');
    const taskBtn = document.getElementById('taskBtn');
    
    // Track when user starts editing
    taskInput.addEventListener('focus', function() {
        isUserEditingTask = true;
        console.log('POPUP.JS: User started editing task');
    });
    
    taskInput.addEventListener('input', function() {
        isUserEditingTask = true;
    });
    
    // Track when user stops editing
    taskInput.addEventListener('blur', function() {
        setTimeout(() => {
            isUserEditingTask = false;
            console.log('POPUP.JS: User stopped editing task');
        }, 100); // Small delay to prevent interference with button clicks
    });
    
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setTask();
        }
    });
    
    taskBtn.addEventListener('click', setTask);
}

function startTimerEditing() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerInput = document.getElementById('timerInput');
    
    isEditingTimer = true;
    
    // Get current duration in minutes
    const currentMinutes = Math.round(currentTimerState.defaultTime / 60);
    timerInput.value = currentMinutes;
    
    timerDisplay.style.display = 'none';
    timerInput.style.display = 'block';
    timerInput.focus();
    timerInput.select();
}

function finishTimerEditing() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerInput = document.getElementById('timerInput');
    
    const minutes = parseInt(timerInput.value);
    
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 90) {
        setDuration(minutes);
    }
    
    isEditingTimer = false;
    timerDisplay.style.display = 'block';
    timerInput.style.display = 'none';
}

function adjustTimerImmediate(direction) {
    if (!currentTimerState) return;
    
    const currentMinutes = Math.round(currentTimerState.defaultTime / 60);
    const newMinutes = Math.max(1, Math.min(90, currentMinutes + direction));
    
    // Update display immediately for instant feedback
    const display = document.getElementById('timerDisplay');
    const minutes = newMinutes;
    const seconds = 0;
    display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update local state immediately
    currentTimerState.defaultTime = newMinutes * 60;
    currentTimerState.timeLeft = newMinutes * 60;
    
    // Then sync with background (no waiting for response)
    chrome.runtime.sendMessage({ 
        action: 'updateDuration', 
        duration: newMinutes 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error setting duration:', chrome.runtime.lastError);
            // Revert on error by forcing a state reload
            setTimeout(loadCurrentState, 100);
        }
    });
}

// Timer control functions
function toggleTimerRunning() {
    if (!currentTimerState) {
        console.error('POPUP.JS: No timer state available');
        return;
    }
    
    const action = currentTimerState.isRunning ? 'stopTimer' : 'startTimer';
    console.log('POPUP.JS: Toggling timer running state:', action);
    
    // Immediate UI feedback
    const startStopBtn = document.getElementById('startStopBtn');
    const status = document.getElementById('timerStatus');
    
    if (currentTimerState.isRunning) {
        // Going from running to paused
        startStopBtn.textContent = 'Start';
        startStopBtn.className = 'timer-btn primary';
        status.textContent = status.textContent.replace('Running', 'Paused');
        currentTimerState.isRunning = false;
        updateTimerControls(false); // Show +/- buttons
    } else {
        // Going from paused to running
        startStopBtn.textContent = 'Pause';
        startStopBtn.className = 'timer-btn';
        status.textContent = status.textContent.replace('Paused', 'Running');
        currentTimerState.isRunning = true;
        updateTimerControls(true); // Hide +/- buttons
    }
    
    // Send to background
    chrome.runtime.sendMessage({ action: action }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling timer:', chrome.runtime.lastError);
            // Revert UI on error
            setTimeout(loadCurrentState, 100);
        }
    });
}

function resetTimer() {
    console.log('POPUP.JS: Resetting timer');
    
    // Immediate UI feedback
    if (currentTimerState) {
        const display = document.getElementById('timerDisplay');
        const minutes = Math.round(currentTimerState.defaultTime / 60);
        display.textContent = `${minutes.toString().padStart(2, '0')}:00`;
        
        const startStopBtn = document.getElementById('startStopBtn');
        startStopBtn.textContent = 'Start';
        startStopBtn.className = 'timer-btn primary';
        
        const status = document.getElementById('timerStatus');
        const modeText = currentTimerState.mode === 'pomodoro' ? 'Pomodoro Mode' : 'Stopwatch Mode';
        status.textContent = `${modeText} • Ready`;
        
        currentTimerState.isRunning = false;
        currentTimerState.timeLeft = currentTimerState.defaultTime;
        updateTimerControls(false);
    }
    
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
    isUserEditingTask = false; // Task has been set, stop editing mode
    
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

function setDuration(minutes) {
    if (isNaN(minutes) || minutes < 1 || minutes > 90) {
        console.error('POPUP.JS: Invalid duration:', minutes);
        return;
    }
    
    console.log('POPUP.JS: Setting duration:', minutes, 'minutes');
    
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