// Website Blocker Background Persistence
// This file handles all website blocking logic independently of the sidepanel
// Works without authentication and persists even when sidepanel is closed

console.log('🛡️ Website Blocker Background Service Starting...');

// Website Blocker state - independent of main extension
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

// Initialize website blocker on startup
async function initializeWebsiteBlocker() {
  try {
    console.log('🔧 Initializing Website Blocker...');
    await loadWebsiteBlockerState();
    setupWebsiteBlockingListeners();
    setupStorageListener(); // CRITICAL FIX: Listen for state changes
    console.log('✅ Website Blocker initialized successfully');
    console.log('🛡️ Current state:', websiteBlockerState);
  } catch (error) {
    console.error('❌ Error initializing Website Blocker:', error);
  }
}

// CRITICAL FIX: Add storage listener to automatically update state when changed
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.websiteBlockerSettings) {
      const newSettings = changes.websiteBlockerSettings.newValue;
      if (newSettings) {
        const oldEnabled = websiteBlockerState.isEnabled;
        websiteBlockerState = { ...websiteBlockerState, ...newSettings };
        console.log(`🔄 Background state updated - isEnabled: ${oldEnabled} → ${websiteBlockerState.isEnabled}`);
      }
    }
  });
}

// Load website blocker state from storage
async function loadWebsiteBlockerState() {
  try {
    const result = await chrome.storage.local.get(['websiteBlockerSettings']);
    if (result.websiteBlockerSettings) {
      websiteBlockerState = { ...websiteBlockerState, ...result.websiteBlockerSettings };
      console.log('🛡️ Website blocker state loaded from storage');
    } else {
      // First time setup - save default state
      await saveWebsiteBlockerState();
      console.log('🛡️ Website blocker initialized with default settings');
    }
  } catch (error) {
    console.error('❌ Error loading website blocker state:', error);
  }
}

// Save website blocker state to storage
async function saveWebsiteBlockerState() {
  try {
    await chrome.storage.local.set({ websiteBlockerSettings: websiteBlockerState });
    console.log('💾 Website blocker state saved');
  } catch (error) {
    console.error('❌ Error saving website blocker state:', error);
  }
}

// Enhanced URL blocking check with proper state validation
function shouldBlockWebsite(url) {
  // CRITICAL FIX: Always check current state from storage before blocking
  if (!websiteBlockerState.isEnabled || !url) {
    console.log(`🚫 Blocking disabled or no URL - isEnabled: ${websiteBlockerState.isEnabled}, url: ${!!url}`);
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
    
    console.log(`🔍 Blocking check for ${hostname}: ${shouldBlock} (isEnabled: ${websiteBlockerState.isEnabled})`);
    return shouldBlock;
  } catch (error) {
    console.error('❌ Error checking if URL should be blocked:', error);
    return false;
  }
}

// CRITICAL FIX: Add function to reload state from storage before blocking decisions
async function reloadWebsiteBlockerState() {
  try {
    const result = await chrome.storage.local.get(['websiteBlockerSettings']);
    if (result.websiteBlockerSettings) {
      const oldState = websiteBlockerState.isEnabled;
      websiteBlockerState = { ...websiteBlockerState, ...result.websiteBlockerSettings };
      
      if (oldState !== websiteBlockerState.isEnabled) {
        console.log(`🔄 State changed: ${oldState} → ${websiteBlockerState.isEnabled}`);
      }
    }
  } catch (error) {
    console.error('❌ Error reloading website blocker state:', error);
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
  const hasCustomImage = websiteBlockerState.customBlockImage;
  
  if (hasCustomImage) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Website Blocked - Stay Focused</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            min-height: 100vh;
            position: relative;
            overflow: hidden;
          }
          .background-image {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            z-index: 1;
          }
          .content-overlay {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 300px;
            z-index: 10;
            color: white;
          }
          .quote {
            font-size: 16px;
            font-style: italic;
            margin-bottom: 15px;
            line-height: 1.4;
          }
          .back-btn {
            background: #007ACC;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.3s;
          }
          .back-btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <img src="${websiteBlockerState.customBlockImage}" alt="Custom block image" class="background-image">
        <div class="content-overlay">
          <div class="quote">"${quote}"</div>
          <button class="back-btn" onclick="history.back()">Go Back</button>
        </div>
      </body>
      </html>
    `;
  } else {
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
            background: #007ACC;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 1rem;
            transition: background 0.3s;
          }
          .back-btn:hover { background: #0056b3; }
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
}

// Block website by replacing content
async function blockWebsiteTab(tabId, url) {
  try {
    console.log(`🛡️ Blocking website: ${url}`);
    
    // Update blocked today count
    websiteBlockerState.blockedToday = (websiteBlockerState.blockedToday || 0) + 1;
    await saveWebsiteBlockerState();
    
    const blockPageContent = generateWebsiteBlockPage(url);
    
    // Inject the block page
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (content) => {
        document.documentElement.innerHTML = content;
      },
      args: [blockPageContent]
    });
    
    console.log(`✅ Website blocked successfully: ${url}`);
  } catch (error) {
    console.error('❌ Error blocking website:', error);
  }
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
    console.error('❌ Error applying granular blocking:', error);
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
        
        let styleElement = document.getElementById('website-blocker-youtube-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'website-blocker-youtube-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('🛡️ YouTube recommendations blocking applied');
      }
    });
  } catch (error) {
    console.error('❌ Error injecting YouTube blocking:', error);
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
        
        let styleElement = document.getElementById('website-blocker-twitter-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'website-blocker-twitter-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('🛡️ Twitter timeline blocking applied');
      }
    });
  } catch (error) {
    console.error('❌ Error injecting Twitter blocking:', error);
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
        
        let styleElement = document.getElementById('website-blocker-instagram-css');
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'website-blocker-instagram-css';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
        console.log('🛡️ Instagram reels blocking applied');
      }
    });
  } catch (error) {
    console.error('❌ Error injecting Instagram blocking:', error);
  }
}

// Setup all website blocking listeners
function setupWebsiteBlockingListeners() {
  console.log('🔧 Setting up website blocking listeners...');
  
  // Tab update listener - CRITICAL FIX: Always reload state first
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log(`🌐 Tab updated: ${tab.url}`);
      
      // CRITICAL FIX: Always reload current state before making blocking decisions
      await reloadWebsiteBlockerState();
      
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
  
  // Before navigate listener for faster blocking - CRITICAL FIX: Always reload state first
  chrome.tabs.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) {
      // CRITICAL FIX: Always reload current state before making blocking decisions
      await reloadWebsiteBlockerState();
      
      if (shouldBlockWebsite(details.url)) {
        console.log(`🛡️ Blocking website before load: ${details.url}`);
        await blockWebsiteTab(details.tabId, details.url);
      }
    }
  });
  
  // Activated tab listener - CRITICAL FIX: Always reload state first
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        // CRITICAL FIX: Always reload current state before making blocking decisions
        await reloadWebsiteBlockerState();
        
        if (shouldBlockWebsite(tab.url)) {
          console.log(`🛡️ Blocking activated tab: ${tab.url}`);
          await blockWebsiteTab(activeInfo.tabId, tab.url);
        }
      }
    } catch (error) {
      // Tab might not exist anymore
    }
  });
  
  // Web navigation listener for granular blocking
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId === 0 && websiteBlockerState.isEnabled) {
      setTimeout(() => {
        applyGranularBlocking(details.tabId, details.url);
      }, 1000);
    }
  });
  
  // Storage listener to stay in sync
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.websiteBlockerSettings) {
      const newSettings = changes.websiteBlockerSettings.newValue;
      if (newSettings) {
        console.log('🔄 Website blocker settings changed:', newSettings);
        websiteBlockerState = { ...websiteBlockerState, ...newSettings };
        
        // Apply changes to all tabs immediately
        await applySettingsToAllTabs();
      }
    }
  });
  
  console.log('✅ Website blocking listeners set up successfully');
}

// Apply current settings to all open tabs
async function applySettingsToAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue;
      }
      
      if (shouldBlockWebsite(tab.url)) {
        await blockWebsiteTab(tab.id, tab.url);
      } else if (websiteBlockerState.isEnabled) {
        await applyGranularBlocking(tab.id, tab.url);
      }
    }
  } catch (error) {
    console.error('❌ Error applying settings to all tabs:', error);
  }
}

// Handle toggle from external sources
async function handleWebsiteBlockerToggle(enabled, settings = {}) {
  try {
    console.log(`🔄 Website blocker toggle: ${enabled ? 'ON' : 'OFF'}`);
    
    websiteBlockerState = { 
      ...websiteBlockerState, 
      ...settings,
      isEnabled: enabled 
    };
    
    await saveWebsiteBlockerState();
    await applySettingsToAllTabs();
    
    console.log(`✅ Website blocker ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('❌ Error handling website blocker toggle:', error);
  }
}

// Export functions for use by background script
if (typeof window !== 'undefined') {
  window.websiteBlockerBackground = {
    initializeWebsiteBlocker,
    handleWebsiteBlockerToggle,
    websiteBlockerState: () => websiteBlockerState
  };
}

// Auto-initialize when loaded
initializeWebsiteBlocker(); 