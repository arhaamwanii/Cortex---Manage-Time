// NEWTAB MAIN SCRIPT - Exact floating timer replica with live updates
console.log('NEWTAB: Starting initialization...');

// Global state - READ ONLY (background is authority)
let isInitialized = false;
let timerElement = null;

// Dragging state (to match floating timer exactly)
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentPosition = { x: 20, y: 100 }; // Default center position for new tab

// Debug logging
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`NEWTAB[${timestamp}]: ${message}`, data || '');
}

// DOM elements
let loadingMessage, errorMessage, timerContainer, blockedMessage;

// Check for blocked URL parameter
function checkBlockedUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockedUrl = urlParams.get('blocked');
    
    if (blockedUrl) {
        showBlockedMessage(blockedUrl);
        return true;
    }
    return false;
}

// UI State Management
function hideAllMessages() {
    if (loadingMessage) loadingMessage.style.display = 'none';
    if (errorMessage) errorMessage.style.display = 'none';
    if (timerContainer) timerContainer.style.display = 'none';
    if (blockedMessage) blockedMessage.style.display = 'none';
}

function showLoading(message = null) {
    hideAllMessages();
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
        if (message && loadingMessage.querySelector('p')) {
            loadingMessage.querySelector('p').textContent = message;
        }
    }
}



function showError(message) {
    hideAllMessages();
    if (errorMessage) {
        errorMessage.style.display = 'block';
        if (errorMessage.querySelector('p')) {
            errorMessage.querySelector('p').textContent = message;
        }
    }
}

function showTimer() {
    hideAllMessages();
    if (timerContainer) {
        timerContainer.style.display = 'block';
        isInitialized = true;
        debugLog('Timer displayed successfully');
    }
}

function showBlockedMessage(blockedUrl) {
    hideAllMessages();
    if (!blockedMessage) {
        createBlockedMessage();
    }
    
    // Update the blocked URL in the message
    const urlSpan = blockedMessage.querySelector('.blocked-url');
    if (urlSpan) {
        urlSpan.textContent = blockedUrl;
    }
    
    blockedMessage.style.display = 'block';
    debugLog('Showing blocked message for URL:', blockedUrl);
}

function createBlockedMessage() {
    blockedMessage = document.createElement('div');
    blockedMessage.className = 'blocked-message';
    blockedMessage.style.cssText = `
        display: none;
        text-align: center;
        color: #ffffff;
        max-width: 600px;
        margin: 0 auto;
        padding: 40px 20px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        backdrop-filter: blur(10px);
    `;
    
    blockedMessage.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
        <h2 style="color: #FFA500; margin-bottom: 16px; font-size: 24px;">Website Blocked</h2>
        <p style="color: #cccccc; margin-bottom: 8px; font-size: 16px;">
            <span class="blocked-url" style="color: #FFA500; font-weight: 600;"></span> is currently blocked.
        </p>
        <p style="color: #888; margin-bottom: 30px; font-size: 14px;">
            Stay focused on your current task. You can manage blocked sites in the extension popup.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button onclick="history.back()" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                ← Go Back
            </button>
            <button onclick="window.location.href='chrome://newtab/'" style="
                background: #FFA500;
                border: none;
                color: #000000;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#FF8C00'" onmouseout="this.style.background='#FFA500'">
                New Tab
            </button>
        </div>
    `;
    
    document.body.appendChild(blockedMessage);
    debugLog('Created blocked message element');
}

// Create EXACT same timer as floating version - using CSS classes
function createTimerElement() {
    if (timerElement) return;
    
    debugLog('Creating timer element using floating timer design...');
    
    timerElement = document.createElement('div');
    timerElement.id = 'pomodoro-timer';
    timerElement.className = 'pomodoro-timer';
    
    // Create timer display
    const display = document.createElement('div');
    display.className = 'timer-display';
    display.textContent = '25:00';
    
    // Create controls (hidden by default, shown on hover)
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
    switchModeBtn.textContent = 'To Stopwatch';
    switchModeBtn.title = 'Switch to Stopwatch';
    switchModeBtn.onclick = () => {
        debugLog('Mode switch clicked');
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
    
    // Create frequency controls (simplified for newtab)
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
    
    // Add close button (hide timer - redirect to chrome://newtab/)
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Return to standard new tab';
    closeBtn.onclick = () => {
        debugLog('Close button clicked - redirecting to chrome://newtab/');
        window.location.href = 'chrome://newtab/';
    };
    timerElement.appendChild(closeBtn);
    
    // Add frequency control listeners
    timerElement.querySelector('#freq-down').addEventListener('click', () => adjustFrequency(-1));
    timerElement.querySelector('#freq-up').addEventListener('click', () => adjustFrequency(1));
    
    // No dragging for new tab - keep it fixed in center
    // setupDragging();
    
    // Show controls on hover (like floating timer but no drag check needed)
    timerElement.onmouseenter = () => {
        controls.style.display = 'flex';
    };
    
    timerElement.onmouseleave = () => {
        controls.style.display = 'none';
    };
    
    // Add to container
    if (timerContainer) {
        timerContainer.appendChild(timerElement);
        debugLog('Timer element created and added to container');
    }
}

// Setup dragging functionality (copied from content.js)
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
    
    // If timer is currently centered (no explicit left/top set), convert to absolute positioning
    if (!timerElement.style.left || timerElement.style.left === '50%') {
        debugLog('Converting from centered to absolute positioning for dragging');
        timerElement.style.transform = 'none';
        timerElement.style.left = rect.left + 'px';
        timerElement.style.top = rect.top + 'px';
        currentPosition.x = rect.left;
        currentPosition.y = rect.top;
    }
    
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
    
    // Calculate new position (keep within viewport bounds)
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    const maxX = window.innerWidth - timerElement.offsetWidth;
    const maxY = window.innerHeight - timerElement.offsetHeight;
    
    currentPosition.x = Math.max(0, Math.min(maxX, newX));
    currentPosition.y = Math.max(0, Math.min(maxY, newY));
    
    timerElement.style.left = currentPosition.x + 'px';
    timerElement.style.top = currentPosition.y + 'px';
}

function stopDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    timerElement.style.cursor = 'grab';
    
    // Save position to storage for this "newtab" domain
    chrome.storage.sync.set({
        'position_newtab': currentPosition
    });
}

// Load saved position for new tab
function loadPosition() {
    chrome.storage.sync.get(['position_newtab'], function(result) {
        if (result.position_newtab) {
            currentPosition = result.position_newtab;
            debugLog('Loaded saved position:', currentPosition);
            
            // Apply saved position
            if (timerElement) {
                timerElement.style.transform = 'none';  // Remove centering transform
                timerElement.style.left = currentPosition.x + 'px';
                timerElement.style.top = currentPosition.y + 'px';
                timerElement.style.cursor = 'grab';
            }
        } else {
            // No saved position - keep it centered using CSS transform
            debugLog('No saved position - keeping timer centered');
            
            if (timerElement) {
                // Keep the CSS centering (left: 50%, top: 50%, transform: translate(-50%, -50%))
                // Don't override the CSS - let it stay centered
                currentPosition = { 
                    x: window.innerWidth / 2 - 150, 
                    y: window.innerHeight / 2 - 100 
                }; // Approximate center for future dragging calculations
                timerElement.style.cursor = 'grab';
            }
        }
    });
}

// Update display functions (copied from content.js)
function updateDisplay(timeLeft, mode) {
    if (!timerElement) return;
    const display = timerElement.querySelector('.timer-display');
    const switchModeBtn = timerElement.querySelector('#switchModeBtn');

    // Format time
    const minutes = Math.floor(Math.abs(timeLeft) / 60);
    const seconds = Math.abs(timeLeft) % 60;
    display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update mode styling and button text
    if (mode === 'stopwatch') {
        timerElement.classList.add('stopwatch-mode');
        if (switchModeBtn) {
            switchModeBtn.textContent = 'To Timer';
            switchModeBtn.title = 'Switch to Timer';
        }
    } else {
        timerElement.classList.remove('stopwatch-mode');
        if (switchModeBtn) {
            switchModeBtn.textContent = 'To Stopwatch';
            switchModeBtn.title = 'Switch to Stopwatch';
        }
    }
}

function updateStartButton(isRunning) {
    if (!timerElement) return;
    const startBtn = timerElement.querySelector('.start-btn');
    if (startBtn) {
        startBtn.textContent = isRunning ? 'Pause' : 'Start';
    }
}

function updateTaskDisplay(currentTask, isRunning, mode) {
    if (!timerElement) return;
    const taskDisplay = timerElement.querySelector('.task-display');
    if (taskDisplay) {
        if (currentTask && currentTask.trim()) {
            taskDisplay.textContent = currentTask;
            taskDisplay.style.display = 'block';
        } else {
            taskDisplay.style.display = 'none';
        }
    }
}

function updateStopwatchDisplay(stopwatch) {
    if (!timerElement) return;
    const stopwatchDisplay = timerElement.querySelector('.stopwatch-display');
    if (stopwatchDisplay && stopwatch) {
        const hours = Math.floor(stopwatch / 3600);
        const minutes = Math.floor((stopwatch % 3600) / 60);
        const seconds = stopwatch % 60;
        stopwatchDisplay.textContent = `Session: ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        stopwatchDisplay.style.display = 'block';
    } else if (stopwatchDisplay) {
        stopwatchDisplay.style.display = 'none';
    }
}

function updateFrequencyControls(reminderFrequency, currentTask, customReminderSound) {
    if (!timerElement) return;
    const freqValue = timerElement.querySelector('#freq-value');
    const reminderIndicator = timerElement.querySelector('.reminder-indicator');
    
    if (freqValue) {
        freqValue.textContent = `${reminderFrequency} min`;
    }
    
    if (reminderIndicator) {
        reminderIndicator.style.display = (currentTask && reminderFrequency > 0) ? 'block' : 'none';
    }
}

// Chrome API validation
function validateChromeAPIs() {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.storage) {
        debugLog('Chrome APIs not available');
        return false;
    }
    debugLog('Chrome APIs validated successfully');
    return true;
}

// Request initial timer state
function requestTimerState() {
    debugLog('Requesting timer state from background...');
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (chrome.runtime.lastError) {
            debugLog('Failed to get timer state:', chrome.runtime.lastError);
            showError('Failed to connect to background script');
            return;
        }
        
        if (response) {
            debugLog('Received timer state - Time:', response.timeLeft, 'Running:', response.isRunning, 'Mode:', response.mode);
            
            // Update all displays
            if (timerElement) {
                updateDisplay(response.timeLeft, response.mode);
                updateStartButton(response.isRunning);
                updateTaskDisplay(response.currentTask, response.isRunning, response.mode);
                updateStopwatchDisplay(response.stopwatch);
                updateFrequencyControls(response.reminderFrequency, response.currentTask, response.customReminderSound);
                debugLog('All displays updated successfully');
            } else {
                debugLog('Timer element not found when trying to update displays');
            }
        } else {
            debugLog('No response received from background script');
        }
    });
}

// CRITICAL: Real-time message listener for live updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debugLog('Received message:', request.action);
    
    if (request.action === 'updateTimerDisplay') {
        // Real-time update from background script
        if (timerElement) {
            updateDisplay(request.timeLeft, request.mode);
            updateStartButton(request.isRunning);
            updateTaskDisplay(request.currentTask, request.isRunning, request.mode);
            updateStopwatchDisplay(request.stopwatch);
            updateFrequencyControls(request.reminderFrequency, request.currentTask, request.customReminderSound);
            debugLog('Timer display updated from background - Time:', request.timeLeft, 'Running:', request.isRunning);
        }
    }
});

// Periodic state sync to ensure we stay in sync
let syncInterval;
function startPeriodicSync() {
    // Request state every 1 second to match floating timer timing
    syncInterval = setInterval(() => {
        if (isInitialized && timerElement) {
            requestTimerState();
        }
    }, 1000);
    debugLog('Started periodic sync every 1 second');
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        debugLog('Stopped periodic sync');
    }
}

// Initialize timer (we only get here if newtab is enabled via redirect)
function initializeTimer() {
    debugLog('Creating timer interface...');
    
    // We only reach this page if newtab is enabled (background redirected us here)
    // So just proceed with timer creation
    createTimerElement();
    // No position loading - keep it fixed in center
    requestTimerState();
    showTimer();
    startPeriodicSync(); // Start live sync
}



// Update search suggestion with platform-specific shortcut
function updateSearchSuggestion() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? 'Cmd+L' : 'Ctrl+L';
    const searchSuggestion = document.getElementById('searchSuggestion');
    if (searchSuggestion) {
        searchSuggestion.textContent = `Use the URL bar to search or press ${shortcut} to jump to URL bar`;
    }
}

// Initialize when DOM is ready
function initialize() {
    debugLog('Initializing newtab timer...');
    
    // Check if this is a blocked URL first
    if (checkBlockedUrl()) {
        debugLog('Blocked URL detected, showing blocked message instead of timer');
        return;
    }
    
    // Get DOM elements
    loadingMessage = document.getElementById('loadingMessage');
    errorMessage = document.getElementById('errorMessage');
    timerContainer = document.getElementById('timerContainer');
    
    // Update search suggestion
    updateSearchSuggestion();
    
    // Validate Chrome APIs
    if (!validateChromeAPIs()) {
        showError('Chrome extension APIs not available');
        return;
    }
    
    // Initialize timer directly (we only get here if enabled via redirect)
    initializeTimer();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// PAGE VISIBILITY API: Handle tab becoming active again after Chrome suspension
console.log('NEWTAB: Setting up page visibility listeners for tab activation detection');

// Listen for visibility changes (primary method)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        debugLog('Tab became visible - refreshing timer state');
        if (isInitialized && timerElement) {
            requestTimerState();
            
            // Also request again after a short delay to handle any timing issues
            setTimeout(() => {
                requestTimerState();
            }, 500);
        }
    }
});

// Listen for window focus (backup method)
window.addEventListener('focus', function() {
    debugLog('Window gained focus - refreshing timer state');
    if (isInitialized && timerElement) {
        requestTimerState();
    }
});

// Listen for pageshow event (handles back/forward cache)
window.addEventListener('pageshow', function(event) {
    debugLog('Page shown (persisted:', event.persisted, ') - refreshing timer state');
    if (isInitialized && timerElement) {
        requestTimerState();
    }
});

// Also refresh state when page loads/reloads
window.addEventListener('load', function() {
    debugLog('Page loaded - refreshing timer state');
    if (isInitialized && timerElement) {
        requestTimerState();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopPeriodicSync();
});



// Timer control functions (copied from content.js and adapted for newtab)
function toggleTimer() {
    debugLog('Toggle timer clicked');
    chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
        if (chrome.runtime.lastError) {
            debugLog('Error getting timer state:', chrome.runtime.lastError);
            return;
        }
        if (response) {
            if (response.isRunning) {
                chrome.runtime.sendMessage({action: 'stopTimer'});
            } else {
                chrome.runtime.sendMessage({action: 'startTimer'});
            }
        }
    });
}

function resetTimer() {
    debugLog('Reset timer clicked');
    chrome.runtime.sendMessage({action: 'resetTimer'});
}

function showSettings() {
    debugLog('Settings clicked');
    const newDuration = prompt('Set timer duration in minutes:', '25');
    if (newDuration && !isNaN(newDuration) && newDuration > 0) {
        chrome.runtime.sendMessage({ 
            action: 'updateDuration', 
            duration: parseInt(newDuration) 
        });
    }
}

function showTaskPrompt() {
    debugLog('Task button clicked');
    const newTask = prompt('What are you working on?', '');
    if (newTask !== null) {
        chrome.runtime.sendMessage({ 
            action: 'setTask', 
            task: newTask 
        });
    }
}

function adjustFrequency(change) {
    debugLog('Adjusting frequency by:', change);
    chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
        if (chrome.runtime.lastError) {
            debugLog('Error getting timer state for frequency adjustment:', chrome.runtime.lastError);
            return;
        }
        if (response) {
            const newFreq = Math.max(1, Math.min(10, response.reminderFrequency + change));
            chrome.runtime.sendMessage({
                action: 'updateReminderFrequency',
                frequency: newFreq
            });
        }
    });
}

debugLog('Script loaded, waiting for DOM...'); 