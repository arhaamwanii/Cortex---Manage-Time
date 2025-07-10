// Elevate Popup Controller - Full Timer Control Interface v2.1 (Cache Bust)
console.log('POPUP.JS: Script loaded and executing v2.1 - Cache Busted!');

// State variables
let timerEnabled = null;
let newtabEnabled = null;
let currentTimerState = null;
let currentTask = '';
let isUserEditingTask = false; // Track if user is actively editing the task input
let isEditingTimer = false; // Track if user is editing timer

// Website blocker state variables
let isBlockingEnabled = null;
let blockedWebsites = [];
let popularSocialMediaSites = [
    'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'youtube.com',
    'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'whatsapp.com'
];

// Performance optimization
let loadStateDebounceTimeout = null;

// Popular sites with their display info
let popularSites = [
    { url: 'youtube.com', name: 'YouTube', icon: 'https://www.youtube.com/favicon.ico' },
    { url: 'facebook.com', name: 'Facebook', icon: 'https://www.facebook.com/favicon.ico' },
    { url: 'instagram.com', name: 'Instagram', icon: 'https://www.instagram.com/favicon.ico' },
    { url: 'twitter.com', name: 'Twitter', icon: 'https://twitter.com/favicon.ico' },
    { url: 'tiktok.com', name: 'TikTok', icon: 'https://www.tiktok.com/favicon.ico' },
    { url: 'reddit.com', name: 'Reddit', icon: 'https://www.reddit.com/favicon.ico' },
    { url: 'pinterest.com', name: 'Pinterest', icon: 'https://www.pinterest.com/favicon.ico' },
    { url: 'linkedin.com', name: 'LinkedIn', icon: 'https://www.linkedin.com/favicon.ico' },
    { url: 'snapchat.com', name: 'Snapchat', icon: 'https://www.snapchat.com/favicon.ico' }
];

// Wait for DOM to be fully loaded with better detection
function initializePopup() {
    console.log('POPUP.JS: Initializing popup with DOM fully ready v2.1...');
    
    // Add comprehensive DOM debugging
    console.log('POPUP.JS: DOM state check:', {
        readyState: document.readyState,
        bodyExists: !!document.body,
        totalElements: document.querySelectorAll('*').length,
        hasContainer: !!document.querySelector('.container'),
        hasBlockerSection: !!document.querySelector('.blocker-section')
    });
    
    // Verify all critical elements exist before proceeding
    const criticalElements = [
        'timerDisplay', 'timerStatus', 'startStopBtn', 'resetBtn', 'modeBtn',
        'taskInput', 'taskBtn', 'timerToggle', 'newtabToggle',
        'blockerToggle', 'blockerStatus', 'blockedCount', 'blockerBar'
    ];
    
    let allElementsReady = true;
    const missingElements = [];
    const foundElements = [];
    
    // Detailed element checking with debugging
    for (const elementId of criticalElements) {
        const element = document.getElementById(elementId);
        if (!element) {
            allElementsReady = false;
            missingElements.push(elementId);
            // Try alternative selectors for blockedCount
            if (elementId === 'blockedCount') {
                const altElement = document.querySelector('.blocked-count');
                console.warn(`POPUP.JS: blockedCount not found by ID, trying class selector:`, !!altElement);
                if (altElement) {
                    console.warn(`POPUP.JS: Found blockedCount by class, but ID mismatch. Element:`, altElement);
                }
            }
        } else {
            foundElements.push(elementId);
        }
    }
    
    console.log('POPUP.JS: Element check results:', {
        found: foundElements,
        missing: missingElements,
        allReady: allElementsReady
    });
    
    if (!allElementsReady) {
        console.warn('POPUP.JS: Some critical elements not ready:', missingElements);
        // Retry after additional delay
        setTimeout(initializePopup, 200);
        return;
    }
    
    console.log('POPUP.JS: All critical elements found, proceeding with initialization v2.1...');
    console.log('🎉 POPUP.JS: CACHE BUST SUCCESSFUL - All fixes are now active!');
    
    // Setup event listeners first (synchronous)
    setupEventListeners();
    
    // Load state after DOM is ready
    setTimeout(() => {
        loadCurrentState();
    }, 10);
    
    // Poll state every 5 seconds to stay synced (further reduced for better performance)
    setInterval(() => {
        loadCurrentStateDebounced();
    }, 5000);
    
    // PAGE VISIBILITY API: Handle popup becoming active again after any suspension
    console.log('POPUP.JS: Setting up page visibility listeners for activation detection');
    
    // Listen for visibility changes (primary method)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('POPUP.JS: Popup became visible - refreshing timer state');
            loadCurrentStateDebounced();
        }
    });
    
    // Listen for window focus (backup method)
    window.addEventListener('focus', function() {
        console.log('POPUP.JS: Popup gained focus - refreshing timer state');
        loadCurrentStateDebounced();
    });
}

// Multiple DOM ready detection methods for maximum compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else if (document.readyState === 'interactive' || document.readyState === 'complete') {
    // DOM is already loaded
    setTimeout(initializePopup, 0);
} else {
    // Fallback
    document.addEventListener('DOMContentLoaded', initializePopup);
}

function loadCurrentStateDebounced() {
    // Clear existing timeout
    if (loadStateDebounceTimeout) {
        clearTimeout(loadStateDebounceTimeout);
    }
    
    // Set new timeout to prevent excessive calls
    loadStateDebounceTimeout = setTimeout(() => {
        loadCurrentState();
    }, 50);
}

function loadCurrentState() {
    console.log('POPUP.JS: Loading current state from background...');
    
    // Make all calls in parallel for faster loading
    Promise.all([
        // Get timer state from background
        new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getTimerState' }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('POPUP.JS: Error getting timer state:', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }
                resolve(response);
            });
        }),
        
        // Get new tab state from storage
        new Promise((resolve) => {
            chrome.storage.sync.get(['newtabEnabled'], function(result) {
                resolve(result);
            });
        }),
        
        // Get website blocker state from storage
        new Promise((resolve) => {
            chrome.storage.local.get(['websiteBlockerSettings'], function(result) {
                resolve(result);
            });
        })
    ]).then(([timerResponse, newtabResult, blockerResult]) => {
        // Process timer state
        if (timerResponse) {
            console.log('POPUP.JS: Received timer state:', timerResponse);
            currentTimerState = timerResponse;
            timerEnabled = timerResponse.enabled;
            currentTask = timerResponse.currentTask || '';
            
            updateTimerDisplay(timerResponse);
            updateTimerToggle();
            updateTaskDisplay();
            updateStopwatchInfo(timerResponse.mode);
            updateTimerControls(timerResponse.isRunning);
        } else {
            console.warn('POPUP.JS: No response from background script');
        }
        
        // Process newtab state
        console.log('POPUP.JS: Loaded newtab state:', newtabResult.newtabEnabled);
        if (newtabResult.newtabEnabled === true || newtabResult.newtabEnabled === false) {
            newtabEnabled = newtabResult.newtabEnabled;
        } else {
            newtabEnabled = true; // Default to true
        }
        console.log('POPUP.JS: Set newtabEnabled to:', newtabEnabled);
        updateNewtabToggle();
        
        // Process website blocker state
        console.log('POPUP.JS: Loaded website blocker settings:', blockerResult.websiteBlockerSettings);
        if (blockerResult.websiteBlockerSettings) {
            isBlockingEnabled = blockerResult.websiteBlockerSettings.isEnabled || false;
            blockedWebsites = blockerResult.websiteBlockerSettings.blockedWebsites || [];
        } else {
            isBlockingEnabled = false;
            blockedWebsites = [];
        }
        console.log('POPUP.JS: Set blocking enabled to:', isBlockingEnabled);
        
        // Update blocker UI after DOM is ready with increased delay
        setTimeout(() => updateBlockerUI(), 150);
    });
}

function updateTimerDisplay(state) {
    const display = document.getElementById('timerDisplay');
    const status = document.getElementById('timerStatus');
    const startStopBtn = document.getElementById('startStopBtn');
    const modeBtn = document.getElementById('modeBtn');
    
    // Add element validation
    if (!display || !status || !startStopBtn || !modeBtn) {
        console.warn('POPUP.JS: Timer display elements not ready');
        return;
    }
    
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
    
    // Add element validation
    if (!taskInput || !taskBtn) {
        console.warn('POPUP.JS: Task display elements not ready');
        return;
    }
    
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

    // Website blocker event listeners
    setupBlockerEventListeners();
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
    
    // Add element validation
    if (!toggle || !card || !statusDot || !statusText) {
        console.warn('POPUP.JS: Timer toggle elements not ready');
        return;
    }
    
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
    
    // Add element validation
    if (!toggle || !card || !statusDot || !statusText) {
        console.warn('POPUP.JS: Newtab toggle elements not ready');
        return;
    }
    
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

// Website Blocker Functions
function setupBlockerEventListeners() {
    console.log('POPUP.JS: Setting up website blocker event listeners');
    
    // Blocker toggle
    document.getElementById('blockerToggle').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleWebsiteBlocker();
    });
    
    // Blocker bar click (dropdown toggle)
    document.getElementById('blockerBar').addEventListener('click', function(e) {
        if (e.target.closest('#blockerToggle')) return; // Don't trigger if clicking toggle
        toggleDropdown();
    });
    
    // Custom site input
    document.getElementById('customSiteInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addCustomSite();
        }
    });
    
    document.getElementById('addCustomSiteBtn').addEventListener('click', addCustomSite);
}

function updateBlockerUI() {
    console.log('POPUP.JS: Updating website blocker UI', {
        enabled: isBlockingEnabled,
        blockedSites: blockedWebsites.length,
        sites: blockedWebsites
    });
    
    // Get elements with null checks
    const toggle = document.getElementById('blockerToggle');
    const status = document.getElementById('blockerStatus');
    const blockedCount = document.getElementById('blockedCount');
    const bar = document.getElementById('blockerBar');
    
    // Check if elements exist before updating with retry mechanism (max 5 retries)
    if (!toggle || !status || !blockedCount || !bar) {
        console.warn('POPUP.JS: Blocker UI elements not ready yet v2.1:', {
            toggle: !!toggle,
            status: !!status,
            blockedCount: !!blockedCount,
            bar: !!bar
        });
        
        // Enhanced debugging for missing elements
        if (!blockedCount) {
            const altBlockedCount = document.querySelector('.blocked-count');
            const allBlockedCounts = document.querySelectorAll('[id*="blocked"], [class*="blocked"], [class*="count"]');
            console.error('POPUP.JS: blockedCount debugging:', {
                byId: !!document.getElementById('blockedCount'),
                byClass: !!altBlockedCount,
                altElement: altBlockedCount,
                similarElements: allBlockedCounts.length,
                allIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
            });
        }
        
        // Retry up to 5 times with exponential backoff
        if (!updateBlockerUI.retryCount) updateBlockerUI.retryCount = 0;
        if (updateBlockerUI.retryCount < 5) {
            updateBlockerUI.retryCount++;
            const delay = Math.min(100 * Math.pow(2, updateBlockerUI.retryCount - 1), 500);
            console.log(`POPUP.JS: Retrying updateBlockerUI in ${delay}ms (attempt ${updateBlockerUI.retryCount}/5) v2.1`);
            setTimeout(() => updateBlockerUI(), delay);
        } else {
            console.error('POPUP.JS: Failed to find blocker UI elements after 5 retries v2.1');
            console.error('POPUP.JS: Final DOM state:', {
                readyState: document.readyState,
                bodyExists: !!document.body,
                elementCount: document.querySelectorAll('*').length,
                containerExists: !!document.querySelector('.container'),
                blockerSectionExists: !!document.querySelector('.blocker-section'),
                allIdsInDocument: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
            });
            
            // Try to continue with available elements (graceful degradation)
            console.warn('POPUP.JS: Attempting graceful degradation with available elements...');
        }
        return;
    }
    
    // Reset retry counter on success
    updateBlockerUI.retryCount = 0;
    
    console.log('POPUP.JS: Updating blocker UI elements - enabled:', isBlockingEnabled);
    
    if (isBlockingEnabled) {
        toggle.classList.add('active');
        bar.classList.add('active');
        status.textContent = 'Active';
        status.classList.remove('inactive');
    } else {
        toggle.classList.remove('active');
        bar.classList.remove('active');
        status.textContent = 'Inactive';
        status.classList.add('inactive');
    }
    
    // Update blocked count with fallback
    if (blockedCount) {
        blockedCount.textContent = blockedWebsites.length;
        console.log('POPUP.JS: Updated blocked count to:', blockedWebsites.length);
    } else {
        // Fallback: try to find by class selector
        const altBlockedCount = document.querySelector('.blocked-count');
        if (altBlockedCount) {
            altBlockedCount.textContent = blockedWebsites.length;
            console.log('POPUP.JS: Updated blocked count via fallback selector to:', blockedWebsites.length);
        } else {
            console.warn('POPUP.JS: Could not update blocked count - element not found');
        }
    }
    
    // Update sites grid
    updateSitesGrid();
    updateCustomSitesList();
    updateBlockedSitesPreview();
    
    console.log('POPUP.JS: Blocker UI update complete');
}

function updateSitesGrid() {
    const sitesGrid = document.getElementById('sitesGrid');
    if (!sitesGrid) {
        console.warn('POPUP.JS: Sites grid element not ready');
        return;
    }
    sitesGrid.innerHTML = '';
    
    popularSites.forEach(site => {
        const siteItem = document.createElement('div');
        siteItem.className = 'site-item';
        const isBlocked = blockedWebsites.includes(site.url);
        
        if (isBlocked) {
            siteItem.classList.add('blocked');
        }
        
        siteItem.innerHTML = `
            <img src="${site.icon}" alt="${site.name}" class="site-icon">
            <span class="site-name">${site.name}</span>
        `;
        
        // Add error handler programmatically to avoid CSP issues
        const img = siteItem.querySelector('img');
        img.addEventListener('error', function() {
            this.style.display = 'none';
        });
        
        siteItem.addEventListener('click', () => toggleSiteBlocking(site.url));
        sitesGrid.appendChild(siteItem);
    });
}

function updateCustomSitesList() {
    const customSitesList = document.getElementById('customSitesList');
    if (!customSitesList) {
        console.warn('POPUP.JS: Custom sites list element not ready');
        return;
    }
    customSitesList.innerHTML = '';
    
    const customSites = blockedWebsites.filter(site => 
        !popularSites.some(popular => popular.url === site)
    );
    
    customSites.forEach(site => {
        const siteItem = document.createElement('div');
        siteItem.className = 'custom-site-item';
        siteItem.innerHTML = `
            <span class="custom-site-url">${site}</span>
            <button class="remove-btn" data-site="${site}">×</button>
        `;
        
        siteItem.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeCustomSite(site);
        });
        
        customSitesList.appendChild(siteItem);
    });
}

function updateBlockedSitesPreview() {
    const preview = document.querySelector('.blocked-sites-preview');
    if (!preview) {
        console.warn('POPUP.JS: Blocked sites preview element not ready');
        return;
    }
    preview.innerHTML = '';
    
    const blockedCount = blockedWebsites.length;
    
    if (blockedCount === 0) {
        preview.innerHTML = '<span class="site-icon placeholder">🌐</span><span class="blocked-count">0</span>';
        return;
    }
    
    // Show up to 3 site icons
    const sitesToShow = Math.min(3, blockedCount);
    let iconsShown = 0;
    
    for (const site of blockedWebsites) {
        if (iconsShown >= sitesToShow) break;
        
        const popularSite = popularSites.find(p => p.url === site);
        if (popularSite) {
            const icon = document.createElement('img');
            icon.src = popularSite.icon;
            icon.alt = popularSite.name;
            icon.className = 'site-icon';
            icon.title = popularSite.name;
            icon.addEventListener('error', function() { this.style.display = 'none'; });
            preview.appendChild(icon);
            iconsShown++;
        }
    }
    
    // Add count
    const countElement = document.createElement('span');
    countElement.className = 'blocked-count';
    countElement.textContent = blockedCount;
    preview.appendChild(countElement);
}

function toggleDropdown() {
    const dropdown = document.getElementById('blockerDropdown');
    const bar = document.getElementById('blockerBar');
    const arrow = document.getElementById('blockerDropdownArrow');
    
    if (dropdown.classList.contains('visible')) {
        dropdown.classList.remove('visible');
        bar.classList.remove('expanded');
        arrow.style.transform = 'rotate(0deg)';
    } else {
        dropdown.classList.add('visible');
        bar.classList.add('expanded');
        arrow.style.transform = 'rotate(180deg)';
    }
}

function toggleWebsiteBlocker() {
    console.log('POPUP.JS: Toggling website blocker. Current state:', isBlockingEnabled);
    
    const newEnabled = !isBlockingEnabled;
    console.log('POPUP.JS: Setting website blocker to:', newEnabled);
    
    // INSTANT UI FEEDBACK: Update UI immediately before background operation
    isBlockingEnabled = newEnabled;
    updateBlockerUI(); // Update UI instantly
    console.log('POPUP.JS: Applied instant UI feedback for blocker toggle');
    
    // Save to storage
    chrome.storage.local.set({ 
        websiteBlockerSettings: { 
            isEnabled: newEnabled,
            blockedWebsites: blockedWebsites
        }
    }, function() {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error saving website blocker state:', chrome.runtime.lastError);
            // Revert UI on error
            isBlockingEnabled = !newEnabled;
            updateBlockerUI();
        } else {
            console.log('POPUP.JS: Successfully saved website blocker state');
            updateBlockerUI();
            
            // Notify background script
            chrome.runtime.sendMessage({ 
                action: 'updateWebsiteBlocker', 
                enabled: newEnabled,
                blockedWebsites: blockedWebsites
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('POPUP.JS: Error notifying background script:', chrome.runtime.lastError);
                } else {
                    console.log('POPUP.JS: Background blocker state updated:', response);
                }
            });
        }
    });
}

function toggleSiteBlocking(siteUrl) {
    console.log('POPUP.JS: Toggling blocking for site:', siteUrl);
    
    const index = blockedWebsites.indexOf(siteUrl);
    if (index > -1) {
        blockedWebsites.splice(index, 1);
        console.log('POPUP.JS: Removed site from blocked list');
    } else {
        blockedWebsites.push(siteUrl);
        console.log('POPUP.JS: Added site to blocked list');
    }
    
    // Immediate UI feedback
    updateBlockerUI();
    
    // Save to storage
    saveBlockerSettings();
}

function addCustomSite() {
    const input = document.getElementById('customSiteInput');
    const url = input.value.trim().toLowerCase();
    
    if (!url) {
        console.warn('POPUP.JS: No URL entered');
        return;
    }
    
    // Clean the URL and validate
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    // More robust URL validation
    if (!cleanUrl.includes('.') || cleanUrl.length < 3) {
        console.error('POPUP.JS: Invalid URL format. Must be a valid domain like "example.com"');
        input.style.borderColor = '#ff4444';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 2000);
        return;
    }
    
    // Check if already blocked
    if (blockedWebsites.includes(cleanUrl)) {
        console.log('POPUP.JS: Site already blocked:', cleanUrl);
        input.style.borderColor = '#ffaa00';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 2000);
        return;
    }
    
    // Add to blocked list
    blockedWebsites.push(cleanUrl);
    input.value = '';
    input.style.borderColor = '#44ff44';
    setTimeout(() => {
        input.style.borderColor = '';
    }, 1000);
    
    console.log('POPUP.JS: Added custom site:', cleanUrl);
    
    // Immediate UI update
    updateBlockerUI();
    
    // Save to storage
    saveBlockerSettings();
}

function removeCustomSite(siteUrl) {
    console.log('POPUP.JS: Removing custom site:', siteUrl);
    
    const index = blockedWebsites.indexOf(siteUrl);
    if (index > -1) {
        blockedWebsites.splice(index, 1);
        
        // Immediate UI update
        updateBlockerUI();
        
        // Save to storage
        saveBlockerSettings();
    }
}

function saveBlockerSettings() {
    console.log('POPUP.JS: Saving blocker settings:', {
        enabled: isBlockingEnabled,
        sites: blockedWebsites
    });
    
    chrome.storage.local.set({ 
        websiteBlockerSettings: { 
            isEnabled: isBlockingEnabled,
            blockedWebsites: blockedWebsites
        }
    }, function() {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error saving blocker settings:', chrome.runtime.lastError);
        } else {
            console.log('POPUP.JS: Blocker settings saved successfully');
            updateBlockerUI();
            
            // Notify background script
            console.log('POPUP.JS: Notifying background script of blocker changes');
            chrome.runtime.sendMessage({ 
                action: 'updateWebsiteBlocker', 
                enabled: isBlockingEnabled,
                blockedWebsites: blockedWebsites
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('POPUP.JS: Error notifying background script:', chrome.runtime.lastError);
                } else {
                    console.log('POPUP.JS: Background script updated successfully:', response);
                }
            });
        }
    });
}

// Emergency function to force state reset
function forceStateReset() {
    console.log('POPUP.JS: Force resetting all states');
    chrome.runtime.sendMessage({ action: 'forceStateReset' });
}

// Diagnostic function to test website blocking
function testWebsiteBlocking(url) {
    console.log('POPUP.JS: Testing website blocking for:', url);
    chrome.runtime.sendMessage({ 
        action: 'testWebsiteBlocking', 
        url: url 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error testing website blocking:', chrome.runtime.lastError);
        } else {
            console.log('POPUP.JS: Website blocking test result:', response);
        }
    });
}

// Add to global scope for manual testing
window.testWebsiteBlocking = testWebsiteBlocking; 