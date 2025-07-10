// Elevate Popup Controller - Full Timer Control Interface v2.1 (Cache Bust)
console.log('POPUP.JS: Script loaded and executing v3.1 - Auto-Enable Blocker & Enhanced UI!');

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
    'facebook.com', 'instagram.com', 'x.com', 'tiktok.com', 'youtube.com',
    'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'whatsapp.com'
];

// Reminder state variables
let reminderEnabled = true;
let reminderVolume = 0.5;
let reminderFrequency = 2;
let hasCustomSound = false;

// Performance optimization
let loadStateDebounceTimeout = null;

// Popular sites with their display info
let popularSites = [
    { url: 'youtube.com', name: 'YouTube', icon: 'https://www.youtube.com/favicon.ico' },
    { url: 'facebook.com', name: 'Facebook', icon: 'https://www.facebook.com/favicon.ico' },
    { url: 'instagram.com', name: 'Instagram', icon: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png' },
    { url: 'x.com', name: 'X (Twitter)', icon: 'https://abs.twimg.com/favicons/twitter.3.ico' },
    { url: 'tiktok.com', name: 'TikTok', icon: 'https://www.tiktok.com/favicon.ico' },
    { url: 'reddit.com', name: 'Reddit', icon: 'https://www.reddit.com/favicon.ico' },
    { url: 'pinterest.com', name: 'Pinterest', icon: 'https://www.pinterest.com/favicon.ico' },
    { url: 'linkedin.com', name: 'LinkedIn', icon: 'https://www.linkedin.com/favicon.ico' },
    { url: 'snapchat.com', name: 'Snapchat', icon: 'https://www.snapchat.com/favicon.ico' }
];

// Wait for DOM to be fully loaded with better detection
function initializePopup() {
    console.log('POPUP.JS: Initializing popup with DOM fully ready v3.1...');
    
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
        'blockerToggle', 'blockerStatus', 'blockedCount', 'blockerBar',
        'reminderToggle', 'reminderStatus', 'reminderBar', 'volumeSlider', 'uploadAudioBtn'
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
    
    console.log('POPUP.JS: All critical elements found, proceeding with initialization v3.1...');
    console.log('🎉 POPUP.JS: v3.1 ENHANCED UI FEEDBACK ACTIVE - All instant feedback features loaded!');
    
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
            
            // Update reminder state
            reminderEnabled = timerResponse.reminderEnabled !== undefined ? timerResponse.reminderEnabled : true;
            reminderVolume = timerResponse.reminderVolume !== undefined ? timerResponse.reminderVolume : 0.5;
            reminderFrequency = timerResponse.reminderFrequency !== undefined ? timerResponse.reminderFrequency : 2;
            hasCustomSound = !!timerResponse.customReminderSound;
            
            updateTimerDisplay(timerResponse);
            updateTimerToggle();
            updateTaskDisplay();
            updateStopwatchInfo(timerResponse.mode);
            updateTimerControls(timerResponse.isRunning);
            updateReminderUI();
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
    
    // Reminder control event listeners
    setupReminderEventListeners();
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
    console.log('POPUP.JS: 🔧 Updating website blocker UI v3.0 - Enhanced Debugging', {
        enabled: isBlockingEnabled,
        blockedSites: blockedWebsites.length,
        sites: blockedWebsites,
        timestamp: Date.now()
    });
    
    // ENHANCED ELEMENT FINDING: Multiple strategies for finding elements
    const elements = {
        toggle: document.getElementById('blockerToggle'),
        status: document.getElementById('blockerStatus'),
        blockedCount: null, // Will be set below with enhanced finding
        bar: document.getElementById('blockerBar')
    };
    
    // ENHANCED BLOCKED COUNT FINDING: Multiple strategies with detailed logging
    console.log('POPUP.JS: 🔍 Enhanced blockedCount element finding...');
    
    // Strategy 1: Standard getElementById
    elements.blockedCount = document.getElementById('blockedCount');
    console.log('POPUP.JS: 📍 Strategy 1 (getElementById):', !!elements.blockedCount);
    
    // Strategy 2: querySelector with ID
    if (!elements.blockedCount) {
        elements.blockedCount = document.querySelector('#blockedCount');
        console.log('POPUP.JS: 📍 Strategy 2 (querySelector #id):', !!elements.blockedCount);
    }
    
    // Strategy 3: querySelector with class
    if (!elements.blockedCount) {
        elements.blockedCount = document.querySelector('.blocked-count');
        console.log('POPUP.JS: 📍 Strategy 3 (querySelector .class):', !!elements.blockedCount);
    }
    
    // Strategy 4: Find within blocker section
    if (!elements.blockedCount) {
        const blockerSection = document.querySelector('.blocker-section');
        if (blockerSection) {
            elements.blockedCount = blockerSection.querySelector('.blocked-count') || 
                                  blockerSection.querySelector('#blockedCount');
            console.log('POPUP.JS: 📍 Strategy 4 (within blocker section):', !!elements.blockedCount);
        }
    }
    
    // Strategy 5: Find by text content pattern
    if (!elements.blockedCount) {
        const spans = document.querySelectorAll('span');
        for (const span of spans) {
            if (span.textContent.match(/^\d+$/) && span.closest('.blocked-sites-preview')) {
                elements.blockedCount = span;
                console.log('POPUP.JS: 📍 Strategy 5 (by text pattern):', !!elements.blockedCount);
                break;
            }
        }
    }
    
    // COMPREHENSIVE ELEMENT ANALYSIS
    console.log('POPUP.JS: 🔍 Comprehensive element analysis:', {
        toggle: !!elements.toggle,
        status: !!elements.status,
        blockedCount: !!elements.blockedCount,
        bar: !!elements.bar,
        blockedCountElement: elements.blockedCount ? {
            id: elements.blockedCount.id,
            className: elements.blockedCount.className,
            tagName: elements.blockedCount.tagName,
            textContent: elements.blockedCount.textContent,
            parentElement: elements.blockedCount.parentElement?.className
        } : null
    });
    
    // DOM STRUCTURE ANALYSIS for debugging
    const domAnalysis = {
        readyState: document.readyState,
        bodyExists: !!document.body,
        totalElements: document.querySelectorAll('*').length,
        blockerSection: !!document.querySelector('.blocker-section'),
        blockedSitesPreview: !!document.querySelector('.blocked-sites-preview'),
        allSpansWithClasses: Array.from(document.querySelectorAll('span[class]')).map(s => ({
            id: s.id,
            className: s.className,
            text: s.textContent.trim()
        })),
        allElementsWithBlockedInName: Array.from(document.querySelectorAll('[id*="blocked"], [class*="blocked"]')).map(el => ({
            id: el.id,
            className: el.className,
            tagName: el.tagName,
            text: el.textContent.trim()
        }))
    };
    console.log('POPUP.JS: 🔍 DOM structure analysis:', domAnalysis);
    
    // CHECK CRITICAL ELEMENTS with detailed error reporting
    const missingElements = [];
    if (!elements.toggle) missingElements.push('toggle');
    if (!elements.status) missingElements.push('status');
    if (!elements.blockedCount) missingElements.push('blockedCount');
    if (!elements.bar) missingElements.push('bar');
    
    if (missingElements.length > 0) {
        console.error('POPUP.JS: ❌ Missing critical elements:', missingElements);
        console.error('POPUP.JS: 🔍 Element search details:', {
            toggle: { found: !!elements.toggle, selector: '#blockerToggle' },
            status: { found: !!elements.status, selector: '#blockerStatus' },
            blockedCount: { found: !!elements.blockedCount, selector: '#blockedCount' },
            bar: { found: !!elements.bar, selector: '#blockerBar' }
        });
        
        // Enhanced retry mechanism with detailed logging
        if (!updateBlockerUI.retryCount) updateBlockerUI.retryCount = 0;
        if (updateBlockerUI.retryCount < 5) {
            updateBlockerUI.retryCount++;
            const delay = Math.min(100 * Math.pow(2, updateBlockerUI.retryCount - 1), 500);
            console.warn(`POPUP.JS: ⏳ Retrying updateBlockerUI in ${delay}ms (attempt ${updateBlockerUI.retryCount}/5) v3.0`);
            console.log('POPUP.JS: 🔄 Current DOM state while retrying:', {
                documentReady: document.readyState,
                bodyChildren: document.body?.children.length,
                containerExists: !!document.querySelector('.container'),
                timestamp: Date.now()
            });
            setTimeout(() => updateBlockerUI(), delay);
        } else {
            console.error('POPUP.JS: ❌ FAILED to find blocker UI elements after 5 retries v3.0');
            console.error('POPUP.JS: 🔍 Final attempt - trying graceful degradation...');
            
            // GRACEFUL DEGRADATION: Try to work with whatever we can find
            console.log('POPUP.JS: 🔧 Attempting to work with available elements only...');
        }
        
        // Even with missing elements, try to update what we can
        if (missingElements.length < 4) {
            console.log('POPUP.JS: 🔧 Partial update with available elements...');
        } else {
            return; // Too many missing elements, abort
        }
    }
    
    // Reset retry counter on success
    updateBlockerUI.retryCount = 0;
    
    console.log('POPUP.JS: ✅ All elements found, proceeding with UI updates v3.0');
    
    // INSTANT UI UPDATES: Apply all changes immediately
    console.log('POPUP.JS: 🎨 Applying instant UI updates - enabled:', isBlockingEnabled);
    
    // Update toggle state with enhanced visual feedback
    if (elements.toggle) {
        console.log('POPUP.JS: 🔄 Updating toggle state:', isBlockingEnabled ? 'ON' : 'OFF');
        if (isBlockingEnabled) {
            elements.toggle.classList.add('active');
            elements.toggle.setAttribute('data-state', 'active');
        } else {
            elements.toggle.classList.remove('active');
            elements.toggle.setAttribute('data-state', 'inactive');
        }
    }
    
    // Update status with enhanced feedback
    if (elements.status) {
        console.log('POPUP.JS: 🔄 Updating status text:', isBlockingEnabled ? 'Active' : 'Inactive');
        if (isBlockingEnabled) {
            elements.status.textContent = 'Active';
            elements.status.classList.remove('inactive');
            elements.status.classList.add('active');
        } else {
            elements.status.textContent = 'Inactive';
            elements.status.classList.remove('active');
            elements.status.classList.add('inactive');
        }
    }
    
    // Update bar state with enhanced feedback
    if (elements.bar) {
        console.log('POPUP.JS: 🔄 Updating bar state:', isBlockingEnabled ? 'active' : 'inactive');
        if (isBlockingEnabled) {
            elements.bar.classList.add('active');
            elements.bar.setAttribute('data-state', 'active');
        } else {
            elements.bar.classList.remove('active');
            elements.bar.setAttribute('data-state', 'inactive');
        }
    }
    
    // Update blocked count with MULTIPLE STRATEGIES
    console.log('POPUP.JS: 🔄 Updating blocked count to:', blockedWebsites.length);
    let blockedCountUpdated = false;
    
    if (elements.blockedCount) {
        elements.blockedCount.textContent = blockedWebsites.length;
        elements.blockedCount.setAttribute('data-count', blockedWebsites.length);
        console.log('POPUP.JS: ✅ Primary blocked count updated successfully');
        blockedCountUpdated = true;
    }
    
    // FALLBACK STRATEGIES for blocked count
    if (!blockedCountUpdated) {
        console.log('POPUP.JS: 🔄 Attempting fallback strategies for blocked count...');
        
        // Fallback 1: All elements with 'blocked-count' class
        const altElements = document.querySelectorAll('.blocked-count');
        altElements.forEach((elem, index) => {
            elem.textContent = blockedWebsites.length;
            elem.setAttribute('data-count', blockedWebsites.length);
            console.log(`POPUP.JS: ✅ Fallback blocked count ${index + 1} updated`);
            blockedCountUpdated = true;
        });
        
        // Fallback 2: Find in blocked sites preview
        if (!blockedCountUpdated) {
            const preview = document.querySelector('.blocked-sites-preview');
            if (preview) {
                const countSpan = preview.querySelector('span:last-child');
                if (countSpan) {
                    countSpan.textContent = blockedWebsites.length;
                    countSpan.setAttribute('data-count', blockedWebsites.length);
                    console.log('POPUP.JS: ✅ Fallback blocked count via preview updated');
                    blockedCountUpdated = true;
                }
            }
        }
    }
    
    if (!blockedCountUpdated) {
        console.error('POPUP.JS: ❌ Could not update blocked count with any strategy');
    }
    
    // INSTANT VISUAL FEEDBACK: Update sites grid with enhanced feedback
    console.log('POPUP.JS: 🎨 Updating sites grid with instant visual feedback...');
    updateSitesGridWithInstantFeedback();
    
    // Update additional UI components
    updateCustomSitesList();
    updateBlockedSitesPreview();
    
    console.log('POPUP.JS: ✅ Blocker UI update complete v3.0 - All systems updated');
}

// ENHANCED SITES GRID UPDATE with instant visual feedback
function updateSitesGridWithInstantFeedback() {
    console.log('POPUP.JS: 🎨 Updating sites grid with enhanced visual feedback...');
    
    const sitesGrid = document.getElementById('sitesGrid');
    if (!sitesGrid) {
        console.warn('POPUP.JS: ⚠️ Sites grid element not found');
        return;
    }
    
    // Clear existing content
    sitesGrid.innerHTML = '';
    
    // Add each site with enhanced visual feedback
    popularSites.forEach((site, index) => {
        const siteItem = document.createElement('div');
        siteItem.className = 'site-item';
        const isBlocked = blockedWebsites.includes(site.url);
        
        console.log(`POPUP.JS: 🔄 Adding site ${index + 1}: ${site.name} (${isBlocked ? 'BLOCKED' : 'ALLOWED'})`);
        
        // ENHANCED VISUAL FEEDBACK: Add blocked state with animation
        if (isBlocked) {
            siteItem.classList.add('blocked');
            siteItem.setAttribute('data-blocked', 'true');
            console.log(`POPUP.JS: 🚫 Site ${site.name} marked as BLOCKED with visual feedback`);
        } else {
            siteItem.setAttribute('data-blocked', 'false');
            console.log(`POPUP.JS: ✅ Site ${site.name} marked as ALLOWED`);
        }
        
        siteItem.innerHTML = `
            <img src="${site.icon}" alt="${site.name}" class="site-icon">
            <span class="site-name">${site.name}</span>
        `;
        
        // Enhanced error handling for images
        const img = siteItem.querySelector('img');
        img.addEventListener('error', function() {
            console.warn(`POPUP.JS: ⚠️ Failed to load icon for ${site.name}`);
            this.style.display = 'none';
        });
        
        img.addEventListener('load', function() {
            console.log(`POPUP.JS: ✅ Successfully loaded icon for ${site.name}`);
        });
        
        // ENHANCED CLICK HANDLER with immediate feedback
        siteItem.addEventListener('click', () => {
            console.log(`POPUP.JS: 🖱️ User clicked on ${site.name} (currently ${isBlocked ? 'BLOCKED' : 'ALLOWED'})`);
            
            // INSTANT VISUAL FEEDBACK: Update appearance immediately
            const willBeBlocked = !isBlocked;
            console.log(`POPUP.JS: 🎨 Applying instant visual feedback: ${site.name} will be ${willBeBlocked ? 'BLOCKED' : 'ALLOWED'}`);
            
            if (willBeBlocked) {
                siteItem.classList.add('blocked');
                siteItem.setAttribute('data-blocked', 'true');
                console.log(`POPUP.JS: 🚫 Instantly applied BLOCKED visual state to ${site.name}`);
            } else {
                siteItem.classList.remove('blocked');
                siteItem.setAttribute('data-blocked', 'false');
                console.log(`POPUP.JS: ✅ Instantly applied ALLOWED visual state to ${site.name}`);
            }
            
            // ENHANCED CLICK ANIMATION
            siteItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                siteItem.style.transform = 'scale(1)';
            }, 150);
            
            // Now call the actual toggle function
            toggleSiteBlocking(site.url);
        });
        
        sitesGrid.appendChild(siteItem);
    });
    
    console.log('POPUP.JS: ✅ Sites grid updated with enhanced visual feedback');
}

// ENHANCED TOGGLE FUNCTIONS with instant UI feedback
function toggleWebsiteBlocker() {
    console.log('POPUP.JS: 🎛️ ENHANCED Website Blocker Toggle v3.0');
    console.log('POPUP.JS: 📊 Current state before toggle:', {
        isBlockingEnabled: isBlockingEnabled,
        blockedWebsites: blockedWebsites.length,
        timestamp: Date.now()
    });
    
    const newEnabled = !isBlockingEnabled;
    console.log('POPUP.JS: 🔄 Toggling website blocker:', {
        from: isBlockingEnabled,
        to: newEnabled,
        action: newEnabled ? 'ENABLING' : 'DISABLING'
    });
    
    // INSTANT UI FEEDBACK: Update local state immediately
    isBlockingEnabled = newEnabled;
    console.log('POPUP.JS: ⚡ Applied instant state change - blocker now:', isBlockingEnabled ? 'ENABLED' : 'DISABLED');
    
    // INSTANT VISUAL FEEDBACK: Update UI immediately
    console.log('POPUP.JS: 🎨 Applying instant visual feedback...');
    updateBlockerUI();
    
    // ENHANCED BUTTON FEEDBACK
    const toggleButton = document.getElementById('blockerToggle');
    if (toggleButton) {
        toggleButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggleButton.style.transform = 'scale(1)';
        }, 150);
        console.log('POPUP.JS: 🎨 Applied button press animation');
    }
    
    console.log('POPUP.JS: ✅ Instant UI feedback complete - now saving to storage...');
    
    // Background operation: Save to storage
    chrome.storage.local.set({ 
        websiteBlockerSettings: { 
            isEnabled: newEnabled,
            blockedWebsites: blockedWebsites
        }
    }, function() {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: ❌ Error saving website blocker state:', chrome.runtime.lastError);
            
            // REVERT UI on error
            console.log('POPUP.JS: 🔄 Reverting UI due to storage error...');
            isBlockingEnabled = !newEnabled;
            updateBlockerUI();
        } else {
            console.log('POPUP.JS: ✅ Successfully saved website blocker state to storage');
            
            // Notify background script
            chrome.runtime.sendMessage({ 
                action: 'updateWebsiteBlocker', 
                enabled: newEnabled,
                blockedWebsites: blockedWebsites
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('POPUP.JS: ❌ Error notifying background script:', chrome.runtime.lastError);
                } else {
                    console.log('POPUP.JS: ✅ Background script notified successfully:', response);
                }
            });
        }
    });
    
    console.log('POPUP.JS: 🎛️ Website blocker toggle complete v3.0');
}

function toggleSiteBlocking(siteUrl) {
    console.log('POPUP.JS: 🎛️ ENHANCED Site Blocking Toggle v3.0');
    console.log('POPUP.JS: 📊 Toggling site blocking for:', {
        url: siteUrl,
        currentlyBlocked: blockedWebsites.includes(siteUrl),
        totalBlockedSites: blockedWebsites.length,
        timestamp: Date.now()
    });
    
    const index = blockedWebsites.indexOf(siteUrl);
    const wasBlocked = index > -1;
    const willBeBlocked = !wasBlocked;
    
    console.log('POPUP.JS: 🔄 Site blocking change:', {
        site: siteUrl,
        action: willBeBlocked ? 'BLOCKING' : 'UNBLOCKING',
        wasBlocked: wasBlocked,
        willBeBlocked: willBeBlocked
    });
    
    // INSTANT STATE CHANGE: Update blocked websites array immediately
    if (wasBlocked) {
        blockedWebsites.splice(index, 1);
        console.log('POPUP.JS: ⚡ Instantly removed site from blocked list');
    } else {
        blockedWebsites.push(siteUrl);
        console.log('POPUP.JS: ⚡ Instantly added site to blocked list');
    }
    
    console.log('POPUP.JS: 📊 Updated blocked websites:', {
        totalCount: blockedWebsites.length,
        sites: blockedWebsites,
        lastAction: willBeBlocked ? 'BLOCKED' : 'UNBLOCKED',
        targetSite: siteUrl
    });
    
    // INSTANT VISUAL FEEDBACK: Update UI immediately
    console.log('POPUP.JS: 🎨 Applying instant visual feedback for site toggle...');
    updateBlockerUI();
    
    // ENHANCED VISUAL FEEDBACK: Find and animate the specific site element
    const siteElements = document.querySelectorAll('.site-item');
    for (const siteElement of siteElements) {
        const siteName = siteElement.querySelector('.site-name');
        if (siteName && siteName.textContent.toLowerCase().includes(siteUrl.split('.')[0])) {
            console.log(`POPUP.JS: 🎨 Found site element for ${siteUrl}, applying animation...`);
            
            // Apply instant visual state
            if (willBeBlocked) {
                siteElement.classList.add('blocked');
                siteElement.setAttribute('data-blocked', 'true');
                console.log(`POPUP.JS: 🚫 Applied BLOCKED visual state to ${siteUrl}`);
            } else {
                siteElement.classList.remove('blocked');
                siteElement.setAttribute('data-blocked', 'false');
                console.log(`POPUP.JS: ✅ Applied ALLOWED visual state to ${siteUrl}`);
            }
            
            // Feedback animation
            siteElement.style.transform = 'scale(0.95)';
            setTimeout(() => {
                siteElement.style.transform = 'scale(1)';
            }, 150);
            
            break;
        }
    }
    
    console.log('POPUP.JS: ✅ Instant visual feedback complete - now saving to storage...');
    
    // Background operation: Save to storage
    saveBlockerSettings();
    
    console.log('POPUP.JS: 🎛️ Site blocking toggle complete v3.0');
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

// ENHANCED SITES GRID UPDATE (wrapper function)
function updateSitesGrid() {
    // Use the enhanced version for all updates
    updateSitesGridWithInstantFeedback();
}

// ENHANCED CUSTOM SITES LIST UPDATE with instant feedback
function updateCustomSitesList() {
    console.log('POPUP.JS: 🔄 Updating custom sites list...');
    
    const customSitesList = document.getElementById('customSitesList');
    if (!customSitesList) {
        console.warn('POPUP.JS: ⚠️ Custom sites list element not found');
        return;
    }
    customSitesList.innerHTML = '';
    
    const customSites = blockedWebsites.filter(site => 
        !popularSites.some(popular => popular.url === site)
    );
    
    console.log('POPUP.JS: 📊 Found custom sites:', customSites.length);
    
    customSites.forEach((site, index) => {
        console.log(`POPUP.JS: 🔄 Adding custom site ${index + 1}: ${site}`);
        
        const siteItem = document.createElement('div');
        siteItem.className = 'custom-site-item';
        siteItem.innerHTML = `
            <span class="custom-site-url">${site}</span>
            <button class="remove-btn" data-site="${site}">×</button>
        `;
        
        siteItem.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`POPUP.JS: 🗑️ User clicked remove for custom site: ${site}`);
            
            // INSTANT VISUAL FEEDBACK: Animate removal
            siteItem.style.transform = 'scale(0.95)';
            setTimeout(() => {
                siteItem.style.opacity = '0.5';
                setTimeout(() => {
                    removeCustomSite(site);
                }, 100);
            }, 150);
        });
        
        customSitesList.appendChild(siteItem);
    });
    
    console.log('POPUP.JS: ✅ Custom sites list updated');
}

// ENHANCED BLOCKED SITES PREVIEW UPDATE with instant feedback
function updateBlockedSitesPreview() {
    console.log('POPUP.JS: 🔄 Updating blocked sites preview...');
    
    const preview = document.querySelector('.blocked-sites-preview');
    if (!preview) {
        console.warn('POPUP.JS: ⚠️ Blocked sites preview element not found');
        return;
    }
    
    // Clear existing content
    preview.innerHTML = '';
    
    const blockedCount = blockedWebsites.length;
    console.log('POPUP.JS: 📊 Total blocked sites for preview:', blockedCount);
    
    if (blockedCount === 0) {
        preview.innerHTML = '<span class="site-icon placeholder">🌐</span><span class="blocked-count" id="blockedCount">0</span>';
        console.log('POPUP.JS: 🔄 Set preview to empty state');
        return;
    }
    
    // Show up to 3 site icons
    const sitesToShow = Math.min(3, blockedCount);
    let iconsShown = 0;
    
    console.log('POPUP.JS: 🔄 Adding site icons to preview...');
    
    for (const site of blockedWebsites) {
        if (iconsShown >= sitesToShow) break;
        
        const popularSite = popularSites.find(p => p.url === site);
        if (popularSite) {
            const icon = document.createElement('img');
            icon.src = popularSite.icon;
            icon.alt = popularSite.name;
            icon.className = 'site-icon';
            icon.title = popularSite.name;
            icon.addEventListener('error', function() { 
                console.warn(`POPUP.JS: ⚠️ Failed to load preview icon for ${popularSite.name}`);
                this.style.display = 'none'; 
            });
            icon.addEventListener('load', function() {
                console.log(`POPUP.JS: ✅ Successfully loaded preview icon for ${popularSite.name}`);
            });
            preview.appendChild(icon);
            iconsShown++;
            console.log(`POPUP.JS: 🔄 Added icon ${iconsShown} for ${popularSite.name}`);
        }
    }
    
    // Add count element with proper ID
    const countElement = document.createElement('span');
    countElement.className = 'blocked-count';
    countElement.id = 'blockedCount';
    countElement.textContent = blockedCount;
    countElement.setAttribute('data-count', blockedCount);
    preview.appendChild(countElement);
    
    console.log('POPUP.JS: 🔄 Added count element with value:', blockedCount);
    console.log('POPUP.JS: ✅ Blocked sites preview updated');
}

// ENHANCED DROPDOWN TOGGLE with instant feedback
function toggleDropdown() {
    console.log('POPUP.JS: 🔄 Toggling dropdown menu...');
    
    const dropdown = document.getElementById('blockerDropdown');
    const bar = document.getElementById('blockerBar');
    const arrow = document.getElementById('blockerDropdownArrow');
    
    if (!dropdown || !bar || !arrow) {
        console.warn('POPUP.JS: ⚠️ Dropdown elements not found');
        return;
    }
    
    const isCurrentlyVisible = dropdown.classList.contains('visible');
    console.log('POPUP.JS: 📊 Dropdown currently visible:', isCurrentlyVisible);
    
    if (isCurrentlyVisible) {
        // Closing dropdown
        dropdown.classList.remove('visible');
        bar.classList.remove('expanded');
        arrow.style.transform = 'rotate(0deg)';
        console.log('POPUP.JS: 🔄 Dropdown closed');
    } else {
        // Opening dropdown
        dropdown.classList.add('visible');
        bar.classList.add('expanded');
        arrow.style.transform = 'rotate(180deg)';
        console.log('POPUP.JS: 🔄 Dropdown opened');
    }
    
    // Add click animation
    arrow.style.transform += ' scale(0.9)';
    setTimeout(() => {
        arrow.style.transform = arrow.style.transform.replace(' scale(0.9)', '');
    }, 150);
    
    console.log('POPUP.JS: ✅ Dropdown toggle complete');
}

// Add to global scope for manual testing
window.testWebsiteBlocking = testWebsiteBlocking;

// LISTEN FOR BACKGROUND MESSAGES (e.g., auto-enable blocker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('POPUP.JS: 📨 Received message from background:', message);
    
    switch (message.action) {
        case 'blockerAutoEnabled':
            console.log('POPUP.JS: 🔒 Blocker was auto-enabled for new focus session');
            // Update local state
            isBlockingEnabled = message.enabled;
            blockedWebsites = message.blockedWebsites || blockedWebsites;
            
            // Update UI immediately with visual feedback
            updateBlockerUI();
            
            // Show subtle notification (non-intrusive)
            const toggle = document.getElementById('blockerToggle');
            if (toggle) {
                // Flash the toggle briefly to show it was auto-enabled
                toggle.style.boxShadow = '0 0 10px rgba(255, 165, 0, 0.6)';
                setTimeout(() => {
                    toggle.style.boxShadow = '';
                }, 1000);
            }
            
            console.log('POPUP.JS: ✅ UI updated for auto-enabled blocker');
            break;
            
        default:
            console.log('POPUP.JS: 🤷 Unknown message action:', message.action);
    }
    
    // Always send response
    sendResponse({ success: true });
});

// REMINDER CONTROL FUNCTIONS
function setupReminderEventListeners() {
    console.log('POPUP.JS: Setting up reminder event listeners');
    
    // Reminder toggle
    document.getElementById('reminderToggle').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleReminder();
    });
    
    // Reminder bar click (dropdown toggle)
    document.getElementById('reminderBar').addEventListener('click', function(e) {
        if (e.target.closest('#reminderToggle')) return; // Don't trigger if clicking toggle
        toggleReminderDropdown();
    });
    
    // Volume slider
    document.getElementById('volumeSlider').addEventListener('input', function(e) {
        updateVolume(e.target.value);
    });
    
    // Audio upload
    document.getElementById('uploadAudioBtn').addEventListener('click', uploadCustomAudio);
    
    // Remove audio
    document.getElementById('removeAudioBtn').addEventListener('click', removeCustomAudio);
    
    // Frequency controls
    document.getElementById('decreaseFreqBtn').addEventListener('click', () => adjustReminderFrequency(-1));
    document.getElementById('increaseFreqBtn').addEventListener('click', () => adjustReminderFrequency(1));
}

function updateReminderUI() {
    console.log('POPUP.JS: Updating reminder UI', {
        enabled: reminderEnabled,
        volume: reminderVolume,
        frequency: reminderFrequency,
        customSound: hasCustomSound
    });
    
    const toggle = document.getElementById('reminderToggle');
    const status = document.getElementById('reminderStatus');
    const bar = document.getElementById('reminderBar');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeDisplay = document.getElementById('volumeDisplay');
    const freqDisplay = document.getElementById('freqDisplay');
    const reminderPreviewText = document.getElementById('reminderPreviewText');
    const uploadBtn = document.getElementById('uploadAudioBtn');
    const fileStatus = document.getElementById('fileStatus');
    
    // Update toggle state
    if (toggle) {
        if (reminderEnabled) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
    
    // Update status text
    if (status) {
        if (reminderEnabled) {
            status.textContent = 'Active';
            status.classList.remove('inactive');
        } else {
            status.textContent = 'Inactive';
            status.classList.add('inactive');
        }
    }
    
    // Update bar state
    if (bar) {
        if (reminderEnabled) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    }
    
    // Update volume controls
    if (volumeSlider && volumeDisplay) {
        const volumePercent = Math.round(reminderVolume * 100);
        volumeSlider.value = volumePercent;
        volumeDisplay.textContent = `${volumePercent}%`;
    }
    
    // Update frequency display
    if (freqDisplay) {
        freqDisplay.textContent = reminderFrequency === 0 ? 'Off' : `${reminderFrequency} min`;
    }
    
    // Update preview text
    if (reminderPreviewText) {
        if (reminderFrequency === 0) {
            reminderPreviewText.textContent = 'Off';
        } else {
            reminderPreviewText.textContent = `Every ${reminderFrequency} min`;
        }
    }
    
    // Update custom audio status
    if (uploadBtn && fileStatus) {
        if (hasCustomSound) {
            uploadBtn.style.display = 'none';
            fileStatus.classList.add('visible');
        } else {
            uploadBtn.style.display = 'flex';
            fileStatus.classList.remove('visible');
        }
    }
}

function toggleReminder() {
    console.log('POPUP.JS: Toggling reminder enabled:', !reminderEnabled);
    
    // Update local state immediately
    reminderEnabled = !reminderEnabled;
    
    // Update UI immediately
    updateReminderUI();
    
    // Send to background
    chrome.runtime.sendMessage({ 
        action: 'toggleReminderEnabled', 
        enabled: reminderEnabled 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error toggling reminder:', chrome.runtime.lastError);
            // Revert on error
            reminderEnabled = !reminderEnabled;
            updateReminderUI();
        }
    });
}

function updateVolume(value) {
    const volume = parseInt(value) / 100; // Convert to 0-1 range
    console.log('POPUP.JS: Updating reminder volume:', volume);
    
    // Update local state immediately
    reminderVolume = volume;
    
    // Update display immediately
    const volumeDisplay = document.getElementById('volumeDisplay');
    if (volumeDisplay) {
        volumeDisplay.textContent = `${value}%`;
    }
    
    // Send to background
    chrome.runtime.sendMessage({ 
        action: 'updateReminderVolume', 
        volume: volume 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error updating volume:', chrome.runtime.lastError);
        }
    });
}

function uploadCustomAudio() {
    console.log('POPUP.JS: Opening file picker for custom audio');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('POPUP.JS: Processing uploaded audio file:', file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const soundDataUrl = event.target.result;
            
            // Update local state immediately
            hasCustomSound = true;
            
            // Update file name display
            const fileName = document.getElementById('fileName');
            if (fileName) {
                fileName.textContent = file.name;
            }
            
            // Update UI immediately
            updateReminderUI();
            
            // Send to background
            chrome.runtime.sendMessage({ 
                action: 'setCustomSound', 
                sound: soundDataUrl 
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('POPUP.JS: Error uploading custom sound:', chrome.runtime.lastError);
                    // Revert on error
                    hasCustomSound = false;
                    updateReminderUI();
                }
            });
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function removeCustomAudio() {
    console.log('POPUP.JS: Removing custom audio');
    
    // Update local state immediately
    hasCustomSound = false;
    
    // Update UI immediately
    updateReminderUI();
    
    // Send to background
    chrome.runtime.sendMessage({ action: 'removeCustomSound' }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error removing custom sound:', chrome.runtime.lastError);
            // Revert on error
            hasCustomSound = true;
            updateReminderUI();
        }
    });
}

function adjustReminderFrequency(change) {
    const newFreq = Math.max(0, Math.min(60, reminderFrequency + change));
    console.log('POPUP.JS: Adjusting reminder frequency from', reminderFrequency, 'to', newFreq);
    
    // Update local state immediately
    reminderFrequency = newFreq;
    
    // Update UI immediately
    updateReminderUI();
    
    // Send to background
    chrome.runtime.sendMessage({ 
        action: 'updateReminderFrequency', 
        frequency: newFreq 
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('POPUP.JS: Error updating frequency:', chrome.runtime.lastError);
            // Revert on error
            reminderFrequency = reminderFrequency - change;
            updateReminderUI();
        }
    });
}

function toggleReminderDropdown() {
    console.log('POPUP.JS: Toggling reminder dropdown');
    
    const dropdown = document.getElementById('reminderDropdown');
    const bar = document.getElementById('reminderBar');
    const arrow = document.getElementById('reminderDropdownArrow');
    
    if (!dropdown || !bar || !arrow) {
        console.warn('POPUP.JS: Reminder dropdown elements not found');
        return;
    }
    
    const isCurrentlyVisible = dropdown.classList.contains('visible');
    
    if (isCurrentlyVisible) {
        dropdown.classList.remove('visible');
        bar.classList.remove('expanded');
        arrow.style.transform = 'rotate(0deg)';
    } else {
        dropdown.classList.add('visible');
        bar.classList.add('expanded');
        arrow.style.transform = 'rotate(180deg)';
    }
    
    // Add click animation
    arrow.style.transform += ' scale(0.9)';
    setTimeout(() => {
        arrow.style.transform = arrow.style.transform.replace(' scale(0.9)', '');
    }, 150);
}