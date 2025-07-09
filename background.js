// Elevate Background Service Worker - Enhanced with Website Blocking
console.log('BACKGROUND: Service worker started');

// Timer state management
let timerState = {
    enabled: false,
    timeLeft: 25 * 60,
    defaultTime: 25 * 60,
    isRunning: false,
    mode: 'pomodoro',
    currentTask: '',
    totalSessionTime: 0,
    startTime: null,
    stopwatch: {
        totalTime: 0,
        sessionTime: 0,
        startTime: null
    },
    reminderFrequency: 0,
    customReminderSound: null,
    reminderIntervalId: null
};

// Website Blocker state - integrated with timer
let websiteBlockerState = {
  isEnabled: false,
  blockedWebsites: [
    'youtube.com',
    'tiktok.com', 
    'instagram.com',
    'x.com',
    'twitter.com',
    'facebook.com',
    'reddit.com'
  ],
  blockedToday: 0,
  granularBlocks: {
    youtubeRecommendations: false,
    twitterTimeline: false,
    instagramReels: false
  },
  customBlockImage: null
};

// Global timer interval
let globalTimerInterval = null;

// Startup initialization
chrome.runtime.onStartup.addListener(() => {
    console.log('BACKGROUND: Extension startup detected');
    initializeExtension();
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('BACKGROUND: Extension installed/updated', details);
    initializeExtension();
});

// Initialize both timer and website blocker
async function initializeExtension() {
    console.log('BACKGROUND: Initializing extension...');
    await loadTimerState();
    await loadWebsiteBlockerState();
    setupWebsiteBlockingListeners();
    console.log('BACKGROUND: Extension initialized successfully');
}

// Load website blocker state from storage
async function loadWebsiteBlockerState() {
  try {
    const result = await chrome.storage.local.get(['websiteBlockerSettings']);
    if (result.websiteBlockerSettings) {
      websiteBlockerState = { ...websiteBlockerState, ...result.websiteBlockerSettings };
      console.log('BACKGROUND: Website blocker state loaded from storage');
    } else {
      // First time setup - save default state
      await saveWebsiteBlockerState();
      console.log('BACKGROUND: Website blocker initialized with default settings');
    }
  } catch (error) {
    console.error('BACKGROUND: Error loading website blocker state:', error);
  }
}

// Save website blocker state to storage
async function saveWebsiteBlockerState() {
  try {
    await chrome.storage.local.set({ websiteBlockerSettings: websiteBlockerState });
    console.log('BACKGROUND: Website blocker state saved');
  } catch (error) {
    console.error('BACKGROUND: Error saving website blocker state:', error);
  }
}

// Check if URL should be blocked
function shouldBlockWebsite(url) {
  if (!websiteBlockerState.isEnabled || !url) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    const shouldBlock = websiteBlockerState.blockedWebsites.some(blocked => {
      const cleanBlocked = blocked.toLowerCase().replace(/^www\./, '');
      return hostname === cleanBlocked || 
             hostname.endsWith('.' + cleanBlocked) ||
             cleanBlocked.endsWith('.' + hostname) ||
             hostname.includes(cleanBlocked) ||
             cleanBlocked.includes(hostname);
    });
    
    console.log(`BACKGROUND: Blocking check for ${hostname}: ${shouldBlock} (isEnabled: ${websiteBlockerState.isEnabled})`);
    return shouldBlock;
  } catch (error) {
    console.error('BACKGROUND: Error checking if URL should be blocked:', error);
    return false;
  }
}

// Block website by redirecting to new tab
async function blockWebsiteTab(tabId, url) {
  try {
    console.log(`BACKGROUND: Blocking website: ${url}`);
    
    // Update blocked today count
    websiteBlockerState.blockedToday = (websiteBlockerState.blockedToday || 0) + 1;
    await saveWebsiteBlockerState();
    
    // Check if new tab redirection is enabled
    const result = await chrome.storage.sync.get(['newtabEnabled']);
    const newtabEnabled = result.newtabEnabled !== false; // Default to true
    
    if (newtabEnabled) {
      // Redirect to our new tab page
      const newTabUrl = chrome.runtime.getURL('newtab.html') + '?blocked=' + encodeURIComponent(url);
      await chrome.tabs.update(tabId, { url: newTabUrl });
    } else {
      // Generate block page content and inject it
      const blockPageContent = generateWebsiteBlockPage(url);
      
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (content) => {
          document.documentElement.innerHTML = content;
        },
        args: [blockPageContent]
      });
    }
    
    console.log(`BACKGROUND: Website blocked successfully: ${url}`);
  } catch (error) {
    console.error('BACKGROUND: Error blocking website:', error);
  }
}

// Generate block page content
function generateWebsiteBlockPage(blockedUrl) {
  const quotes = [
    "Focus on your goals, not distractions.",
    "Every moment you resist distraction, you build willpower.",
    "Your future self will thank you for staying focused.",
    "Progress, not perfection.",
    "Stay focused and never give up.",
    "Discipline is choosing between what you want now and what you want most.",
    "Great things never come from comfort zones.",
    "Success is the sum of small efforts repeated daily."
  ];
  
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Website Blocked - Stay Focused</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
        }
        .container {
          background: rgba(0, 0, 0, 0.7);
          padding: 2rem;
          border-radius: 1rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 500px;
        }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        .blocked-url { 
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-family: monospace;
          margin: 1rem 0;
          word-break: break-all;
          font-size: 0.9rem;
        }
        .quote {
          font-size: 1.2rem;
          font-style: italic;
          margin: 1.5rem 0;
          line-height: 1.4;
        }
        .back-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 1rem;
          transition: background 0.3s;
        }
        .back-btn:hover { background: #45a049; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎯 Website Blocked</h1>
        <div class="blocked-url">${blockedUrl}</div>
        <div class="quote">"${quote}"</div>
        <button class="back-btn" onclick="history.back()">Go Back</button>
      </div>
    </body>
    </html>
  `;
}

// Setup website blocking listeners
function setupWebsiteBlockingListeners() {
  console.log('BACKGROUND: Setting up website blocking listeners...');
  
  // Tab update listener
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log(`BACKGROUND: Tab updated: ${tab.url}`);
      
      if (shouldBlockWebsite(tab.url)) {
        await blockWebsiteTab(tabId, tab.url);
      } else {
        // Apply granular blocking for allowed sites
        setTimeout(() => {
          applyGranularBlocking(tabId, tab.url);
        }, 1000);
      }
    }
  });
  
  // Before navigate listener for faster blocking
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) {
      if (shouldBlockWebsite(details.url)) {
        console.log(`BACKGROUND: Blocking website before load: ${details.url}`);
        await blockWebsiteTab(details.tabId, details.url);
      }
    }
  });
  
  // Storage listener to stay in sync
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.websiteBlockerSettings) {
      const newSettings = changes.websiteBlockerSettings.newValue;
      if (newSettings) {
        console.log('BACKGROUND: Website blocker settings changed:', newSettings);
        websiteBlockerState = { ...websiteBlockerState, ...newSettings };
      }
    }
  });
  
  console.log('BACKGROUND: Website blocking listeners set up successfully');
}

// Apply granular blocking for specific platforms
async function applyGranularBlocking(tabId, url) {
  if (!websiteBlockerState.isEnabled) return;
  
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    
    // YouTube granular blocking
    if (websiteBlockerState.granularBlocks?.youtubeRecommendations === true && 
        (hostname === 'youtube.com' || hostname.endsWith('.youtube.com'))) {
      await injectYouTubeBlocking(tabId);
    }
    
    // X/Twitter granular blocking
    if (websiteBlockerState.granularBlocks?.twitterTimeline === true && 
        (hostname === 'x.com' || hostname === 'twitter.com' || 
         hostname.endsWith('.x.com') || hostname.endsWith('.twitter.com'))) {
      await injectTwitterBlocking(tabId);
    }
    
    // Instagram granular blocking
    if (websiteBlockerState.granularBlocks?.instagramReels === true && 
        (hostname === 'instagram.com' || hostname.endsWith('.instagram.com'))) {
      await injectInstagramBlocking(tabId);
    }
  } catch (error) {
    console.error('BACKGROUND: Error applying granular blocking:', error);
  }
}

// Inject YouTube recommendations blocking
async function injectYouTubeBlocking(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const css = `
          /* Hide YouTube homepage feed */
          ytd-browse[page-subtype="home"] #contents ytd-rich-grid-renderer,
          ytd-browse[page-subtype="home"] #contents ytd-rich-section-renderer,
          ytd-browse[page-subtype="home"] #primary,
          ytd-browse[page-subtype="home"] .ytd-rich-grid-renderer,
          
          /* Hide recommended videos in sidebar */
          ytd-watch-next-secondary-results-renderer,
          #related,
          #watch-sidebar,
          .watch-sidebar,
          
          /* Hide homepage chips/filters */
          ytd-browse[page-subtype="home"] ytd-feed-filter-chip-bar-renderer,
          
          /* Hide shorts shelf on homepage */
          ytd-browse[page-subtype="home"] ytd-rich-shelf-renderer[is-shorts],
          ytd-browse[page-subtype="home"] ytd-reel-shelf-renderer,
          
          /* Hide suggestions at video end */
          .ytp-endscreen-content,
          .ytp-ce-video,
          .ytp-ce-channel {
            display: none !important;
          }
        `;
        
        let styleElement = document.getElementById('elevate-youtube-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'elevate-youtube-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('BACKGROUND: YouTube recommendations blocking applied');
      }
    });
  } catch (error) {
    console.error('BACKGROUND: Error injecting YouTube blocking:', error);
  }
}

// Inject Twitter timeline blocking
async function injectTwitterBlocking(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const css = `
          /* Hide main timeline feeds */
          [data-testid="primaryColumn"] [aria-label*="Timeline"],
          [data-testid="primaryColumn"] section[role="region"],
          div[data-testid="primaryColumn"] > div > div:nth-child(2),
          
          /* Hide For You and Following tabs content */
          [data-testid="primaryColumn"] [role="tabpanel"],
          [data-testid="primaryColumn"] article,
          
          /* Hide trending and who to follow */
          [data-testid="sidebarColumn"] [aria-label*="Timeline: Trending"],
          [data-testid="sidebarColumn"] [aria-label*="Who to follow"],
          [data-testid="sidebarColumn"] [data-testid="trend"],
          
          /* Hide promoted content */
          [data-testid="placementTracking"],
          article[data-testid="tweet"]:has([data-testid="promotedIndicator"]) {
            display: none !important;
          }
        `;
        
        let styleElement = document.getElementById('elevate-twitter-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'elevate-twitter-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('BACKGROUND: Twitter timeline blocking applied');
      }
    });
  } catch (error) {
    console.error('BACKGROUND: Error injecting Twitter blocking:', error);
  }
}

// Inject Instagram reels blocking
async function injectInstagramBlocking(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        const css = `
          /* Hide Reels icon from navigation */
          a[href="/reels/"],
          a[href*="/reels"],
          nav a[role="link"]:has(svg):nth-child(3),
          
          /* Hide Reels in main navigation bar */
          div[role="tablist"] a[href="/reels/"],
          div[role="tablist"] a[href*="reels"],
          
          /* Hide Reels from stories bar */
          section[role="main"] div[role="button"]:has([aria-label*="Reel"]),
          
          /* Alternative selectors for Reels icon */
          [aria-label*="Reels"],
          a[aria-label*="Reels"] {
            display: none !important;
          }
        `;
        
        let styleElement = document.getElementById('elevate-instagram-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'elevate-instagram-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('BACKGROUND: Instagram reels blocking applied');
      }
    });
  } catch (error) {
    console.error('BACKGROUND: Error injecting Instagram blocking:', error);
  }
}

// Handle toggle from external sources
async function handleWebsiteBlockerToggle(enabled, settings = {}) {
  try {
    console.log(`BACKGROUND: Website blocker toggle: ${enabled ? 'ON' : 'OFF'}`);
    
    websiteBlockerState = { 
      ...websiteBlockerState, 
      ...settings,
      isEnabled: enabled 
    };
    
    await saveWebsiteBlockerState();
    
    console.log(`BACKGROUND: Website blocker ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('BACKGROUND: Error handling website blocker toggle:', error);
  }
}

// NEW TAB REDIRECT LOGIC (instead of chrome_url_overrides)
// Track tabs that are created for navigation (links, redirects) - these should NOT be redirected
const navigationTabs = new Set();

// Listen for tabs created specifically for navigation (links, redirects, etc.)
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log('BACKGROUND: Navigation target created:', details);
  navigationTabs.add(details.tabId);
  
  // Clean up after navigation completes or fails
  setTimeout(() => {
    navigationTabs.delete(details.tabId);
  }, 5000); // Clean up after 5 seconds
});

chrome.tabs.onCreated.addListener((tab) => {
  console.log('BACKGROUND: New tab created:', {
    url: tab.url, 
    id: tab.id, 
    openerTabId: tab.openerTabId,
    pendingUrl: tab.pendingUrl
  });
  
  // Check if it's a blank new tab
  const isBlankTab = tab.url === 'chrome://newtab/' || 
                     tab.url === 'about:blank' || 
                     !tab.url || 
                     tab.url === '' ||
                     tab.url === 'chrome://new-tab-page/';
  
  if (isBlankTab) {
    // If this tab is marked as a navigation target, DO NOT redirect
    if (navigationTabs.has(tab.id)) {
      console.log('BACKGROUND: Tab is navigation target, will not redirect');
      return;
    }
    
    // Check for pendingUrl which indicates intended navigation
    if (tab.pendingUrl && tab.pendingUrl !== 'chrome://newtab/' && tab.pendingUrl !== 'about:blank') {
      console.log('BACKGROUND: Tab has pendingUrl, will not redirect:', tab.pendingUrl);
      return;
    }
    
    // If tab has opener but no pendingUrl, wait briefly to see if URL loads
    if (tab.openerTabId) {
      console.log('BACKGROUND: Tab has opener, checking for URL loading...');
      setTimeout(() => {
        // Double-check this isn't a navigation target that was missed
        if (navigationTabs.has(tab.id)) {
          console.log('BACKGROUND: Tab became navigation target, not redirecting');
          return;
        }
        
        chrome.tabs.get(tab.id, (updatedTab) => {
          if (chrome.runtime.lastError) {
            return;
          }
          
          // If still blank and not a navigation target, might be a weird edge case - redirect
          const stillBlank = updatedTab.url === 'chrome://newtab/' || 
                            updatedTab.url === 'about:blank' || 
                            !updatedTab.url || 
                            updatedTab.url === '' ||
                            updatedTab.url === 'chrome://new-tab-page/';
          
          if (stillBlank && !navigationTabs.has(tab.id)) {
            console.log('BACKGROUND: Tab with opener remained blank, redirecting as fallback');
            redirectToTimer(tab.id);
          }
        });
      }, 100);
    } else {
      // No opener and no pendingUrl = genuine new tab (Ctrl+T, + button) - redirect immediately
      console.log('BACKGROUND: Genuine new tab (no opener, no pendingUrl), redirecting immediately');
      redirectToTimer(tab.id);
    }
  }
});

function redirectToTimer(tabId) {
  chrome.storage.sync.get(['newtabEnabled'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: Storage error checking newtab state:', chrome.runtime.lastError);
      return;
    }
    
    const newtabEnabled = result.newtabEnabled !== false; // Default to true
    
    if (newtabEnabled) {
      console.log('BACKGROUND: Redirecting to Elevate timer, tab:', tabId);
      const extensionUrl = chrome.runtime.getURL('newtab.html');
      chrome.tabs.update(tabId, { url: extensionUrl }).catch((error) => {
        console.error('BACKGROUND: Failed to redirect new tab:', error);
      });
    } else {
      console.log('BACKGROUND: Newtab disabled - letting browser handle normally');
    }
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('BACKGROUND: Received message:', request.action, 'from', sender.tab ? `tab ${sender.tab.id}` : 'popup/extension');
  
  switch(request.action) {
    case 'ping':
      // Simple ping for connectivity testing
      sendResponse({ success: true, timestamp: Date.now() });
      break;
      
    case 'getTimerState':
      const state = {
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        defaultTime: timerState.defaultTime,
        enabled: timerState.enabled,
        timerVisible: true, // Always visible in background
        currentTask: timerState.currentTask,
        mode: timerState.mode,
        reminderFrequency: timerState.reminderFrequency,
        customReminderSound: timerState.customReminderSound
      };
      console.log('BACKGROUND: Sending timer state:', state);
      sendResponse(state);
      break;
      
    case 'startTimer':
      console.log('BACKGROUND: Starting timer, enabled:', timerState.enabled);
      if (timerState.enabled) {
        startGlobalTimer();
        broadcastTimerUpdate('timerStart');
      }
      sendResponse({ success: true, enabled: timerState.enabled });
      break;
      
    case 'stopTimer':
      console.log('BACKGROUND: Stopping timer');
      stopGlobalTimer();
      broadcastTimerUpdate('timerStop');
      sendResponse({ success: true });
      break;
      
    case 'resetTimer':
      console.log('BACKGROUND: Resetting timer');
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'switchMode':
      console.log('BACKGROUND: Switching mode from', timerState.mode);
      stopGlobalTimer();
      if (timerState.mode === 'pomodoro') {
        timerState.mode = 'stopwatch';
        timerState.timeLeft = 0;
      } else {
        timerState.mode = 'pomodoro';
        timerState.timeLeft = timerState.defaultTime;
      }
      broadcastTimerUpdate('modeSwitch');
      debouncedSaveTimerState();
      sendResponse({ success: true, mode: timerState.mode });
      break;
      
    case 'updateDuration':
      console.log('BACKGROUND: Updating duration to', request.duration, 'minutes');
      timerState.defaultTime = request.duration * 60;
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'setTask':
      console.log('BACKGROUND: Setting task to:', request.task);
      timerState.currentTask = request.task;
      if (timerState.currentTask) {
          startTaskReminder();
      } else {
          stopTaskReminder();
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate('taskUpdate');
      sendResponse({ success: true, task: timerState.currentTask });
      break;
      
    case 'toggleEnabled':
      // This is for the popup toggle - controls the main enabled state
      console.log('BACKGROUND: Toggle enabled from', timerState.enabled, 'to', request.enabled, 'source:', request.source);
      timerState.enabled = request.enabled;
      // When disabled via popup, also hide the timer
      if (!request.enabled) {
        // No-op, visibility is controlled by the X button
      } else {
        // When enabled via popup, make timer visible
        // No-op, visibility is controlled by the X button
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate('enabledToggle');
      sendResponse({ success: true, enabled: timerState.enabled });
      break;
      
    case 'toggleVisible':
      // This is for the X button - only controls visibility, not enabled state
      console.log('BACKGROUND: Toggle visible from', true, 'to', request.visible, 'source:', request.source); // Always visible in background
      // No-op, visibility is controlled by the X button
      debouncedSaveTimerState();
      broadcastTimerUpdate('visibleToggle');
      sendResponse({ success: true, enabled: timerState.enabled, timerVisible: true });
      break;
      
    case 'getEnabled':
      sendResponse({ enabled: timerState.enabled, timerVisible: true });
      break;
      
    case 'toggleStopwatch':
      console.log('BACKGROUND: Toggling stopwatch');
      if (timerState.mode === 'stopwatch') {
        stopStopwatch();
      } else {
        startStopwatch();
      }
      sendResponse({ success: true });
      break;
      
    case 'updateReminderFrequency':
      console.log('BACKGROUND: Updating reminder frequency to', request.frequency);
      timerState.reminderFrequency = request.frequency;
      if (timerState.isRunning && timerState.currentTask) {
        startTaskReminder(); // Restart with new frequency
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate('reminderFrequencyUpdate');
      sendResponse({ success: true });
      break;
      
    case 'setCustomSound':
        console.log('BACKGROUND: Setting custom sound');
        timerState.customReminderSound = request.sound;
        debouncedSaveTimerState();
        sendResponse({ success: true });
        break;

    case 'removeCustomSound':
        console.log('BACKGROUND: Removing custom sound');
        timerState.customReminderSound = null;
        debouncedSaveTimerState();
        sendResponse({ success: true });
        break;
        
    case 'toggleNewtab':
      console.log('BACKGROUND: Toggling new tab redirect to:', request.enabled);
      // Handle new tab toggle with proper error handling
      chrome.storage.sync.set({ newtabEnabled: request.enabled }, function() {
        if (chrome.runtime.lastError) {
          console.error('BACKGROUND: Error saving newtab state:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('BACKGROUND: Newtab redirect state saved successfully:', request.enabled);
          sendResponse({ success: true, enabled: request.enabled });
        }
      });
      return true; // Indicates async response
      break;
      
    case 'getNewtabState':
      chrome.storage.sync.get(['newtabEnabled'], function(result) {
        const enabled = result.newtabEnabled !== undefined ? result.newtabEnabled : true;
        sendResponse({ enabled: enabled });
      });
      return true; // Indicates async response
      
    case 'reportTimerState':
      // TIMER CONTROLS POPUP: Content script reports actual timer visibility
      console.log('BACKGROUND: Timer reporting its actual state:', request);
      console.log('BACKGROUND: Current stored visible state before update:', true); // Always visible
      console.log('BACKGROUND: Timer says it is actually visible:', request.actuallyVisible);
      
      // CRITICAL FIX: Ensure we only accept boolean values, never null/undefined
      if (typeof request.actuallyVisible === 'boolean') {
        // Timer is the authority for visibility - if it reports different state, sync everything
        if (true !== request.actuallyVisible) { // Always visible in background
          console.log('BACKGROUND: Timer visibility mismatch detected! Timer says:', request.actuallyVisible, 'Background says:', true);
          console.log('BACKGROUND: Updating stored visible state to match timer reality:', request.actuallyVisible);
          // No-op, visibility is controlled by the X button
          debouncedSaveTimerState();
          // Force sync popup and other tabs
          forceSyncAllTabs();
        } else {
          console.log('BACKGROUND: Timer and background visibility state are synchronized:', request.actuallyVisible);
        }
      } else {
        console.warn('BACKGROUND: Timer reported invalid state (not boolean):', request.actuallyVisible, 'ignoring');
      }
      sendResponse({ success: true });
      break;
      
    case 'forceStateReset':
      // EMERGENCY RESET: Force all components to sync to background state
      console.log('BACKGROUND: Force state reset requested');
      forceSyncAllTabs();
      sendResponse({ success: true });
      break;

    case 'toggleWebsiteBlocker':
      handleWebsiteBlockerToggle(request.enabled, request.settings);
      sendResponse({ success: true });
      break;

    case 'getWebsiteBlockerState':
      sendResponse({ 
          success: true, 
          state: websiteBlockerState 
      });
      break;

    case 'updateWebsiteBlockerSettings':
      websiteBlockerState = { ...websiteBlockerState, ...request.settings };
      saveWebsiteBlockerState();
      sendResponse({ success: true });
      break;
  }
});

// Function to dynamically update new tab override
function updateManifestNewtab(enabled) {
  // Note: Chrome extensions cannot dynamically modify manifest.json
  // The new tab override is controlled by the newtab.html file itself
  // We'll handle this in the newtab.html by checking the newtabEnabled setting
}

// Clean up when browser closes
chrome.runtime.onSuspend.addListener(function() {
  // Force immediate save on suspend - no debouncing
  saveTimerState();
});

function startGlobalTimer() {
    console.log('BACKGROUND: Starting global timer. Current state:', timerState);
    
    // Stop any existing timer
    if (globalTimerInterval) {
        clearInterval(globalTimerInterval);
    }
    
    // Set running state and start time
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    
    // Start task reminder if enabled
    startTaskReminder();
    
    globalTimerInterval = setInterval(() => {
        if (timerState.mode === 'pomodoro') {
            timerState.timeLeft--;
            timerState.totalSessionTime++;
            
            if (timerState.timeLeft <= 0) {
                console.log('BACKGROUND: Pomodoro completed');
                stopGlobalTimer();
                // Optionally reset for next session
                timerState.timeLeft = timerState.defaultTime;
            }
        } else {
            // Stopwatch mode
            timerState.stopwatch.sessionTime++;
            timerState.stopwatch.totalTime++;
            timerState.timeLeft = timerState.stopwatch.sessionTime; // Use for display
        }
        
        // Save state every 30 seconds to avoid too frequent writes
        if (timerState.totalSessionTime % 30 === 0 || timerState.stopwatch.sessionTime % 30 === 0) {
            debouncedSaveTimerState();
        }
        
        // Broadcast update
        broadcastTimerUpdate('timerTick');
    }, 1000);
    
    saveTimerState();
    broadcastTimerUpdate('timerStart');
    console.log('BACKGROUND: Global timer started');
}

function stopGlobalTimer() {
    console.log('BACKGROUND: Stopping global timer');
    
    if (globalTimerInterval) {
        clearInterval(globalTimerInterval);
        globalTimerInterval = null;
    }
    
    timerState.isRunning = false;
    stopTaskReminder();
    
    saveTimerState();
    broadcastTimerUpdate('timerStop');
    console.log('BACKGROUND: Global timer stopped');
}

function resetGlobalTimer() {
    console.log('BACKGROUND: Resetting global timer');
    
    stopGlobalTimer();
    
    if (timerState.mode === 'pomodoro') {
        timerState.timeLeft = timerState.defaultTime;
    } else {
        timerState.stopwatch.sessionTime = 0;
        timerState.timeLeft = 0;
    }
    
    timerState.startTime = null;
    
    saveTimerState();
    broadcastTimerUpdate('timerReset');
    console.log('BACKGROUND: Global timer reset');
}

function broadcastTimerUpdate(source = null) {
    const updateData = {
        enabled: timerState.enabled,
        timeLeft: timerState.timeLeft,
        defaultTime: timerState.defaultTime,
        isRunning: timerState.isRunning,
        mode: timerState.mode,
        currentTask: timerState.currentTask,
        totalSessionTime: timerState.totalSessionTime,
        stopwatch: timerState.stopwatch,
        reminderFrequency: timerState.reminderFrequency,
        customReminderSound: timerState.customReminderSound,
        source: source
    };
    
    console.log('BACKGROUND: Broadcasting timer update:', updateData);
    
    // Send to all tabs
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'timerUpdate',
                data: updateData
            }).catch(() => {
                // Ignore errors for tabs that don't have content script
            });
        });
    });
    
    // Send to popup if open
    chrome.runtime.sendMessage({
        type: 'timerUpdate',
        data: updateData
    }).catch(() => {
        // Popup might not be open
    });
}

function forceSyncAllTabs() {
    console.log('BACKGROUND: Force syncing all tabs');
    
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'forceSync',
                data: {
                    enabled: timerState.enabled,
                    timeLeft: timerState.timeLeft,
                    defaultTime: timerState.defaultTime,
                    isRunning: timerState.isRunning,
                    mode: timerState.mode,
                    currentTask: timerState.currentTask,
                    totalSessionTime: timerState.totalSessionTime,
                    stopwatch: timerState.stopwatch,
                    reminderFrequency: timerState.reminderFrequency,
                    customReminderSound: timerState.customReminderSound
                }
            }).catch(() => {
                // Ignore errors for tabs that don't have content script
            });
        });
    });
}

function startStopwatch() {
    console.log('BACKGROUND: Starting stopwatch mode');
    
    timerState.mode = 'stopwatch';
    timerState.stopwatch.startTime = Date.now();
    timerState.isRunning = true;
    timerState.timeLeft = timerState.stopwatch.sessionTime;
    
    // Use the same global timer but different logic
    startGlobalTimer();
}

function stopStopwatch() {
    console.log('BACKGROUND: Stopping stopwatch mode');
    stopGlobalTimer();
}

function startTaskReminder() {
    if (timerState.reminderFrequency > 0 && timerState.currentTask) {
        stopTaskReminder(); // Clear any existing reminder
        
        const reminderInterval = timerState.reminderFrequency * 60 * 1000; // Convert to milliseconds
        timerState.reminderIntervalId = setInterval(() => {
            console.log('BACKGROUND: Task reminder triggered');
            // Send reminder to all tabs
            broadcastTimerUpdate('taskReminder');
        }, reminderInterval);
        
        console.log(`BACKGROUND: Task reminder started (${timerState.reminderFrequency} min intervals)`);
    }
}

function stopTaskReminder() {
    if (timerState.reminderIntervalId) {
        clearInterval(timerState.reminderIntervalId);
        timerState.reminderIntervalId = null;
        console.log('BACKGROUND: Task reminder stopped');
    }
}

function saveTimerState() {
    console.log('BACKGROUND: Saving timer state');
    chrome.storage.local.set({
        timerState: {
            enabled: timerState.enabled,
            timeLeft: timerState.timeLeft,
            defaultTime: timerState.defaultTime,
            isRunning: timerState.isRunning,
            mode: timerState.mode,
            currentTask: timerState.currentTask,
            totalSessionTime: timerState.totalSessionTime,
            stopwatch: timerState.stopwatch,
            reminderFrequency: timerState.reminderFrequency,
            customReminderSound: timerState.customReminderSound
        }
    }).catch((error) => {
        console.error('BACKGROUND: Error saving timer state:', error);
    });
}

// Debounced save to reduce storage writes
let saveTimerTimeout = null;
function debouncedSaveTimerState() {
    if (saveTimerTimeout) {
        clearTimeout(saveTimerTimeout);
    }
    saveTimerTimeout = setTimeout(() => {
        saveTimerState();
    }, 1000);
}

async function loadTimerState() {
    try {
        console.log('BACKGROUND: Loading timer state from storage');
        const result = await chrome.storage.local.get(['timerState']);
        
        if (result.timerState) {
            // Restore most state but not running state
            timerState = {
                ...timerState,
                ...result.timerState,
                isRunning: false, // Never restore running state
                startTime: null
            };
            
            // Clear any reminder interval
            timerState.reminderIntervalId = null;
            
            console.log('BACKGROUND: Timer state loaded:', timerState);
        } else {
            console.log('BACKGROUND: No saved timer state found, using defaults');
            // Save initial state
            saveTimerState();
        }
    } catch (error) {
        console.error('BACKGROUND: Error loading timer state:', error);
    }
}

// Auto-save timer state every 5 minutes when running
setInterval(() => {
    if (timerState.isRunning) {
        console.log('BACKGROUND: Auto-saving timer state');
        saveTimerState();
    }
}, 5 * 60 * 1000);

// Handle storage changes from other sources
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.timerState && changes.timerState.newValue) {
        console.log('BACKGROUND: Timer state changed externally');
        // Don't override local state if we're actively running
        if (!timerState.isRunning) {
            const newState = changes.timerState.newValue;
            timerState = {
                ...timerState,
                ...newState,
                isRunning: false // Never allow external running state
            };
            console.log('BACKGROUND: Timer state updated from external change');
        }
    }
});

// Clean up navigation tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (navigationTabs.has(tabId)) {
    console.log('BACKGROUND: Cleaning up closed navigation tab:', tabId);
    navigationTabs.delete(tabId);
  }
});

// Listen for tab updates to redirect new tab pages when enabled
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // Only proceed if the tab has finished loading
    if (changeInfo.status !== 'complete') return;
    
    // Skip if URL is undefined or not a new tab
    if (!tab.url) return;
    
    // Enhanced new tab detection
    const isNewTab = tab.url === 'chrome://newtab/' || 
                     tab.url === 'chrome://new-tab-page/' ||
                     tab.url === 'edge://newtab/' ||
                     tab.url === 'about:newtab' ||
                     tab.url === 'about:home';
    
    if (isNewTab) {
        console.log('BACKGROUND: New tab detected:', tab.url);
        redirectToTimer(tabId);
    }
});

// Handle tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (chrome.runtime.lastError) {
            console.log('BACKGROUND: Error getting tab info:', chrome.runtime.lastError);
            return;
        }
        
        // Enhanced new tab detection for activated tabs
        const isNewTab = tab.url === 'chrome://newtab/' || 
                         tab.url === 'chrome://new-tab-page/' ||
                         tab.url === 'edge://newtab/' ||
                         tab.url === 'about:newtab' ||
                         tab.url === 'about:home';
        
        if (isNewTab) {
            console.log('BACKGROUND: Activated new tab detected:', tab.url);
            redirectToTimer(activeInfo.tabId);
        }
    });
});

// Message handling for both timer and website blocker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('BACKGROUND: Message received:', request);
    
    // Website blocker messages
    if (request.action === 'toggleWebsiteBlocker') {
        handleWebsiteBlockerToggle(request.enabled, request.settings);
        sendResponse({ success: true });
        return;
    }
    
    if (request.action === 'getWebsiteBlockerState') {
        sendResponse({ 
            success: true, 
            state: websiteBlockerState 
        });
        return;
    }
    
    if (request.action === 'updateWebsiteBlockerSettings') {
        websiteBlockerState = { ...websiteBlockerState, ...request.settings };
        saveWebsiteBlockerState();
        sendResponse({ success: true });
        return;
    }
    
    // Timer messages (existing functionality)
    if (request.action === 'getTimerState') {
        const response = {
            enabled: timerState.enabled,
            timeLeft: timerState.timeLeft,
            defaultTime: timerState.defaultTime,
            isRunning: timerState.isRunning,
            mode: timerState.mode,
            currentTask: timerState.currentTask,
            totalSessionTime: timerState.totalSessionTime,
            stopwatch: timerState.stopwatch,
            reminderFrequency: timerState.reminderFrequency,
            customReminderSound: timerState.customReminderSound
        };
        console.log('BACKGROUND: Sending timer state:', response);
        sendResponse(response);
        return;
    }
    
    // Other existing timer functionality...
    switch(request.action) {
        case 'startTimer':
            startGlobalTimer();
            break;
        case 'stopTimer':
            stopGlobalTimer();
            break;
        case 'resetTimer':
            resetGlobalTimer();
            break;
        case 'updateDuration':
            if (request.duration && request.duration >= 1 && request.duration <= 90) {
                timerState.defaultTime = request.duration * 60;
                if (!timerState.isRunning) {
                    timerState.timeLeft = timerState.defaultTime;
                }
                saveTimerState();
                broadcastTimerUpdate('durationUpdate');
            }
            break;
        case 'setTask':
            timerState.currentTask = request.task || '';
            saveTimerState();
            broadcastTimerUpdate('taskUpdate');
            break;
        case 'switchMode':
            if (timerState.mode === 'pomodoro') {
                startStopwatch();
            } else {
                stopStopwatch();
                timerState.mode = 'pomodoro';
                timerState.timeLeft = timerState.defaultTime;
                timerState.isRunning = false;
                if (globalTimerInterval) {
                    clearInterval(globalTimerInterval);
                    globalTimerInterval = null;
                }
            }
            saveTimerState();
            broadcastTimerUpdate('modeSwitch');
            break;
        case 'toggleEnabled':
            timerState.enabled = request.enabled;
            console.log('BACKGROUND: Timer enabled state changed to:', timerState.enabled);
            saveTimerState();
            broadcastTimerUpdate('enabledToggle');
            break;
        case 'forceStateReset':
            console.log('BACKGROUND: Force resetting timer state');
            timerState.isRunning = false;
            if (globalTimerInterval) {
                clearInterval(globalTimerInterval);
                globalTimerInterval = null;
            }
            saveTimerState();
            broadcastTimerUpdate('forceReset');
            break;
    }
    
    sendResponse({ success: true });
});

// Function to dynamically update new tab override
async function updateManifestNewtab(enabled) {
    console.log('BACKGROUND: Updating new tab override to:', enabled);
    try {
        // Note: In MV3, we can't dynamically modify the manifest
        // The override is handled by detecting and redirecting new tab pages
        // This function is kept for compatibility but doesn't modify manifest
        
        // Store the preference
        await chrome.storage.sync.set({ newtabEnabled: enabled });
        console.log('BACKGROUND: New tab preference saved:', enabled);
    } catch (error) {
        console.error('BACKGROUND: Error updating new tab preference:', error);
    }
}

console.log('BACKGROUND: Service worker setup complete');

// Initialize on startup
initializeExtension();