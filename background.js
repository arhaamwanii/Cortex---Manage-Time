// Background script for synchronized timer
console.log('BACKGROUND: Service worker starting/restarting at', new Date().toISOString());

// NEW TAB REDIRECT LOGIC (instead of chrome_url_overrides)
// Track tabs that are created for navigation (links, redirects) - these should NOT be redirected
const navigationTabs = new Set();
const extensionTabs = new Set(); // Track tabs opened from extension contexts

// Listen for tabs created specifically for navigation (links, redirects, etc.)
chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  console.log('BACKGROUND: Navigation target created:', details);
  navigationTabs.add(details.tabId);
  
  // Clean up after navigation completes or fails
  setTimeout(() => {
    navigationTabs.delete(details.tabId);
  }, 10000); // Increased timeout to 10 seconds
});

chrome.tabs.onCreated.addListener((tab) => {
  console.log('BACKGROUND: New tab created:', {
    url: tab.url, 
    id: tab.id, 
    openerTabId: tab.openerTabId,
    pendingUrl: tab.pendingUrl
  });
  
  // Check if this tab was opened from an extension context
  if (tab.openerTabId) {
    chrome.tabs.get(tab.openerTabId, (openerTab) => {
      if (!chrome.runtime.lastError && openerTab.url) {
        if (openerTab.url.startsWith('chrome-extension://') || openerTab.url.startsWith('moz-extension://')) {
          console.log('BACKGROUND: Tab opened from extension context, marking as extension tab');
          extensionTabs.add(tab.id);
          // Clean up after 15 seconds
          setTimeout(() => {
            extensionTabs.delete(tab.id);
          }, 15000);
          return; // Don't redirect extension-opened tabs
        }
      }
    });
  }
  
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
    
    // If this tab is marked as extension-opened, DO NOT redirect
    if (extensionTabs.has(tab.id)) {
      console.log('BACKGROUND: Tab opened from extension, will not redirect');
      return;
    }
    
    // Check for pendingUrl which indicates intended navigation
    if (tab.pendingUrl && tab.pendingUrl !== 'chrome://newtab/' && tab.pendingUrl !== 'about:blank') {
      console.log('BACKGROUND: Tab has pendingUrl, will not redirect:', tab.pendingUrl);
      return;
    }
    
    // If tab has opener, wait longer to see if URL loads
    if (tab.openerTabId) {
      console.log('BACKGROUND: Tab has opener, waiting longer to check for URL loading...');
      
      // First check after 500ms
      setTimeout(() => {
        if (navigationTabs.has(tab.id) || extensionTabs.has(tab.id)) {
          console.log('BACKGROUND: Tab became navigation/extension target, not redirecting');
          return;
        }
        
        chrome.tabs.get(tab.id, (updatedTab) => {
          if (chrome.runtime.lastError) {
            return;
          }
          
          const stillBlank = updatedTab.url === 'chrome://newtab/' || 
                            updatedTab.url === 'about:blank' || 
                            !updatedTab.url || 
                            updatedTab.url === '' ||
                            updatedTab.url === 'chrome://new-tab-page/';
          
          if (stillBlank && !navigationTabs.has(tab.id) && !extensionTabs.has(tab.id)) {
            // Wait even longer before final decision
            setTimeout(() => {
              chrome.tabs.get(tab.id, (finalTab) => {
                if (chrome.runtime.lastError) {
                  return;
                }
                
                const finallyBlank = finalTab.url === 'chrome://newtab/' || 
                                   finalTab.url === 'about:blank' || 
                                   !finalTab.url || 
                                   finalTab.url === '' ||
                                   finalTab.url === 'chrome://new-tab-page/';
                
                if (finallyBlank && !navigationTabs.has(tab.id) && !extensionTabs.has(tab.id)) {
                  console.log('BACKGROUND: Tab with opener remained blank after extended wait, redirecting as fallback');
                  redirectToTimer(tab.id);
                } else {
                  console.log('BACKGROUND: Tab with opener now has URL or is marked as navigation/extension, not redirecting');
                }
              });
            }, 2000); // Wait another 2 seconds for final check
          }
        });
      }, 500);
    } else {
      // No opener = likely genuine new tab (Ctrl+T, + button)
      // But still wait briefly in case it's a delayed navigation
      setTimeout(() => {
        if (navigationTabs.has(tab.id) || extensionTabs.has(tab.id)) {
          console.log('BACKGROUND: Tab became navigation/extension target during delay, not redirecting');
          return;
        }
        
        chrome.tabs.get(tab.id, (updatedTab) => {
          if (chrome.runtime.lastError) {
            return;
          }
          
          const stillBlank = updatedTab.url === 'chrome://newtab/' || 
                            updatedTab.url === 'about:blank' || 
                            !updatedTab.url || 
                            updatedTab.url === '' ||
                            updatedTab.url === 'chrome://new-tab-page/';
          
          if (stillBlank && !navigationTabs.has(tab.id) && !extensionTabs.has(tab.id)) {
            console.log('BACKGROUND: Genuine new tab confirmed (no opener, remained blank), redirecting');
            redirectToTimer(tab.id);
          } else {
            console.log('BACKGROUND: Tab without opener now has URL or is marked as navigation/extension, not redirecting');
          }
        });
      }, 200); // Short delay for no-opener tabs
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

// Handle direct navigation to our newtab page when disabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Track when navigation tabs start loading real URLs
  if (navigationTabs.has(tabId) && changeInfo.url) {
    const url = changeInfo.url;
    if (url !== 'chrome://newtab/' && 
        url !== 'about:blank' && 
        url !== '' && 
        url !== 'chrome://new-tab-page/' &&
        !url.includes('newtab.html')) {
      console.log('BACKGROUND: Navigation tab loading real URL:', url);
      // Keep it in navigationTabs to prevent any future redirect attempts
    }
  }
  
  // Track when extension tabs start loading real URLs
  if (extensionTabs.has(tabId) && changeInfo.url) {
    const url = changeInfo.url;
    if (url !== 'chrome://newtab/' && 
        url !== 'about:blank' && 
        url !== '' && 
        url !== 'chrome://new-tab-page/' &&
        !url.includes('newtab.html')) {
      console.log('BACKGROUND: Extension tab loading real URL:', url);
      // Keep it in extensionTabs to prevent any future redirect attempts
    }
  }
  
  // Only check when the page is loading our newtab.html
  if (changeInfo.status === 'loading' && tab.url && tab.url.includes('newtab.html')) {
    chrome.storage.sync.get(['newtabEnabled'], (result) => {
      const newtabEnabled = result.newtabEnabled !== false; // Default to true
      
      if (!newtabEnabled) {
        console.log('BACKGROUND: Newtab accessed while disabled - redirecting to chrome://newtab/');
        chrome.tabs.update(tabId, { url: 'chrome://newtab/' }).catch((error) => {
          console.error('BACKGROUND: Failed to redirect disabled newtab:', error);
        });
      }
    });
  }
});

// Clean up navigation tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (navigationTabs.has(tabId)) {
    console.log('BACKGROUND: Cleaning up closed navigation tab:', tabId);
    navigationTabs.delete(tabId);
  }
});

// Clean up tracking sets when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (navigationTabs.has(tabId)) {
    navigationTabs.delete(tabId);
    console.log('BACKGROUND: Cleaned up navigation tab:', tabId);
  }
  if (extensionTabs.has(tabId)) {
    extensionTabs.delete(tabId);
    console.log('BACKGROUND: Cleaned up extension tab:', tabId);
  }
});

let globalTimer = {
  timeLeft: 25 * 60,
  isRunning: false,
  defaultTime: 25 * 60,
  interval: null,
  enabled: true,
  timerVisible: true, // Separate state for timer visibility (controlled by X button)
  currentTask: '',
  mode: 'pomodoro', // 'pomodoro' or 'stopwatch'
  reminderFrequency: 2, // in minutes
  customReminderSound: null,
  reminderVolume: 0.5, // Volume for reminder sounds (0.0 to 1.0)
  reminderEnabled: true // Master toggle for reminder sounds
};

let stopwatch = {
  time: 0,
  isRunning: false,
  interval: null
};

let taskReminderInterval = null;

// Website blocker state
let websiteBlockerState = {
  isEnabled: true, // Start enabled for easier testing
  blockedWebsites: ['youtube.com', 'facebook.com', 'instagram.com', 'x.com', 'tiktok.com', 'reddit.com'],
  blockedToday: 0,
  customBlockImage: null
};

// Domain-specific timer visibility state
let hiddenDomains = new Set(); // Domains where timer has been hidden

// CRITICAL FIX: Debounced saving to prevent quota issues
let saveTimeout = null;
let lastSavedState = null;
let pendingStateChange = false;

// Extract domain from URL for visibility tracking
function extractDomain(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
  } catch (error) {
    console.error('BACKGROUND: Error extracting domain from URL:', url, error);
    return null;
  }
}

// Check if timer should be visible on a domain
function isTimerVisibleOnDomain(domain) {
  if (!domain) return globalTimer.timerVisible; // Fallback to global state
  // If timer is globally disabled, always hidden
  if (!globalTimer.enabled) return false;
  // For domain-specific visibility: if domain is not in hiddenDomains, it's visible
  // Global timerVisible only matters when there's no domain-specific setting
  return !hiddenDomains.has(domain);
}

// Hide timer on a specific domain
function hideTimerOnDomain(domain) {
  if (!domain) return;
  console.log('BACKGROUND: 🙈 Hiding timer on domain:', domain);
  hiddenDomains.add(domain);
  saveHiddenDomains();
}

// Show timer on a specific domain
function showTimerOnDomain(domain) {
  if (!domain) return;
  console.log('BACKGROUND: 👁️ Showing timer on domain:', domain);
  hiddenDomains.delete(domain);
  saveHiddenDomains();
}

// Save hidden domains to storage
function saveHiddenDomains() {
  const hiddenDomainsArray = Array.from(hiddenDomains);
  chrome.storage.sync.set({ hiddenDomains: hiddenDomainsArray }, function() {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: Error saving hidden domains:', chrome.runtime.lastError);
    } else {
      console.log('BACKGROUND: Hidden domains saved:', hiddenDomainsArray);
    }
  });
}

// Load hidden domains from storage
function loadHiddenDomains() {
  chrome.storage.sync.get(['hiddenDomains'], function(result) {
    if (result.hiddenDomains && Array.isArray(result.hiddenDomains)) {
      hiddenDomains = new Set(result.hiddenDomains);
      console.log('BACKGROUND: Loaded hidden domains:', Array.from(hiddenDomains));
    } else {
      console.log('BACKGROUND: No hidden domains found in storage');
    }
  });
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('BACKGROUND: Extension startup detected');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('BACKGROUND: Extension installed/updated');
});

// Prevent service worker from going inactive
setInterval(() => {
  console.log('BACKGROUND: Service worker keepalive ping');
}, 20000);

// NEW TAB FUNCTIONALITY: Now handled via background redirect (no chrome_url_overrides permission needed)
// When a new tab is created, we redirect to our extension page if newtabEnabled=true

// STATE RESET: Initialize timer from storage with forced synchronization
chrome.storage.sync.get(['timerState', 'timerDuration', 'timerEnabled', 'timerVisible', 'stopwatchState', 'newtabEnabled'], function(result) {
  console.log('BACKGROUND: Initializing with stored state:', result);
  
  if (result.timerDuration) {
    globalTimer.defaultTime = result.timerDuration * 60;
  }
  
  // CRITICAL FIX: Always set enabled to a boolean value, never null
  if (result.timerEnabled !== undefined && result.timerEnabled !== null) {
    globalTimer.enabled = Boolean(result.timerEnabled);
    console.log('BACKGROUND: Loaded timerEnabled from storage:', globalTimer.enabled);
  } else {
    // FORCE RESET: If no stored state, set to enabled and save immediately
    console.log('BACKGROUND: No timerEnabled found, forcing to true');
    globalTimer.enabled = true;
    // CRITICAL: Save state immediately to fix null issue
    chrome.storage.sync.set({ timerEnabled: true }, function() {
      console.log('BACKGROUND: Forced timerEnabled to true in storage');
    });
  }
  
  // Initialize timerVisible state
  if (result.timerVisible !== undefined && result.timerVisible !== null) {
    globalTimer.timerVisible = Boolean(result.timerVisible);
    console.log('BACKGROUND: Loaded timerVisible from storage:', globalTimer.timerVisible);
  } else {
    // Default to true (visible)
    globalTimer.timerVisible = true;
    chrome.storage.sync.set({ timerVisible: true });
  }
  
  // Initialize newtabEnabled state
  if (result.newtabEnabled === undefined || result.newtabEnabled === null) {
    console.log('BACKGROUND: No newtabEnabled found, setting default to true');
    chrome.storage.sync.set({ newtabEnabled: true });
  } else {
    console.log('BACKGROUND: Loaded newtabEnabled from storage:', result.newtabEnabled);
  }
  
  // EMERGENCY NULL CHECK: Ensure enabled is never null after initialization
  if (globalTimer.enabled === null || globalTimer.enabled === undefined) {
    console.error('BACKGROUND: EMERGENCY FIX - enabled was null/undefined, forcing to true');
    globalTimer.enabled = true;
    chrome.storage.sync.set({ timerEnabled: true });
  }
  
  if (result.timerState) {
    globalTimer.timeLeft = result.timerState.timeLeft;
    globalTimer.isRunning = result.timerState.isRunning;
    globalTimer.defaultTime = result.timerState.defaultTime;
    globalTimer.currentTask = result.timerState.currentTask || '';
    globalTimer.mode = result.timerState.mode || 'pomodoro';
    globalTimer.reminderFrequency = result.timerState.reminderFrequency || 2;
    globalTimer.customReminderSound = result.timerState.customReminderSound || null;
    globalTimer.reminderVolume = result.timerState.reminderVolume || 0.5;
    globalTimer.reminderEnabled = result.timerState.reminderEnabled !== undefined ? result.timerState.reminderEnabled : true;
    
    // Resume timer if it was running and enabled
    if (globalTimer.isRunning && globalTimer.enabled) {
      startGlobalTimer();
    }
  } else {
    globalTimer.timeLeft = globalTimer.defaultTime;
    // FORCE SAVE: Ensure default state is stored
    debouncedSaveTimerState();
  }

  if (result.stopwatchState) {
    stopwatch = result.stopwatchState;
    if (stopwatch.isRunning) {
      startStopwatch();
    }
  }
  
  // CRITICAL: Force broadcast initial state to all tabs after 500ms
  setTimeout(() => {
    console.log('BACKGROUND: Force broadcasting initial state to sync all components');
    forceSyncAllTabs();
    // Set initial badge state
    updateIconBadge();
  }, 500);
  
  // Initialize standalone audio reminder system after timer initialization
  initializeAudioReminderSystem();
  
  // Load domain-specific visibility settings
  loadHiddenDomains();
});

// Initialize website blocker from storage
chrome.storage.local.get(['websiteBlockerSettings'], function(result) {
  console.log('BACKGROUND: Initializing website blocker with stored settings:', result);
  
  if (result.websiteBlockerSettings) {
    websiteBlockerState = { ...websiteBlockerState, ...result.websiteBlockerSettings };
    console.log('BACKGROUND: Loaded existing blocker settings');
  } else {
    // Save default settings
    console.log('BACKGROUND: No existing settings, saving defaults');
    chrome.storage.local.set({ websiteBlockerSettings: websiteBlockerState }, function() {
      if (chrome.runtime.lastError) {
        console.error('BACKGROUND: Error saving default blocker settings:', chrome.runtime.lastError);
      } else {
        console.log('BACKGROUND: Default blocker settings saved successfully');
      }
    });
  }
  
  console.log('BACKGROUND: Website blocker initialized with state:', {
    enabled: websiteBlockerState.isEnabled,
    blockedSites: websiteBlockerState.blockedWebsites,
    blockedToday: websiteBlockerState.blockedToday
  });
  
  // Setup website blocking listeners
  console.log('BACKGROUND: Setting up website blocking listeners...');
  setupWebsiteBlockingListeners();
  console.log('BACKGROUND: Website blocking listeners setup complete');
});

// =====================================
// STANDALONE AUDIO REMINDER SYSTEM
// =====================================

// Completely standalone audio reminder state - NOT tied to timer
let audioReminderSystem = {
  enabled: true,
  frequency: 2, // minutes
  volume: 0.5,
  customSound: null,
  intervalId: null
};

// Initialize standalone audio reminder system from storage
function initializeAudioReminderSystem() {
  chrome.storage.sync.get(['audioReminderSystem'], function(result) {
    if (result.audioReminderSystem) {
      audioReminderSystem = { ...audioReminderSystem, ...result.audioReminderSystem };
      console.log('BACKGROUND: 🔊 Loaded standalone audio reminder settings:', {
        enabled: audioReminderSystem.enabled,
        frequency: audioReminderSystem.frequency,
        volume: audioReminderSystem.volume,
        hasCustomSound: !!audioReminderSystem.customSound,
        customSoundLength: audioReminderSystem.customSound ? audioReminderSystem.customSound.length : 0
      });
    } else {
      console.log('BACKGROUND: 🔊 No existing audio reminder settings found, using defaults');
    }
    
    // Start audio reminders if enabled and frequency > 0
    if (audioReminderSystem.enabled && audioReminderSystem.frequency > 0) {
      startStandaloneAudioReminders();
    } else {
      console.log('BACKGROUND: 🔊 Audio reminders not started - enabled:', audioReminderSystem.enabled, 'frequency:', audioReminderSystem.frequency);
    }
  });
}

// Start the standalone audio reminder system
function startStandaloneAudioReminders() {
  console.log('BACKGROUND: 🔊 Starting standalone audio reminders');
  stopStandaloneAudioReminders(); // Stop any existing reminders
  
  if (!audioReminderSystem.enabled || audioReminderSystem.frequency === 0) {
    console.log('BACKGROUND: 🔊 Audio reminders disabled or frequency is 0');
    return;
  }
  
  const intervalMs = audioReminderSystem.frequency * 60 * 1000; // Convert minutes to milliseconds
  console.log('BACKGROUND: 🔊 Starting audio reminders every', audioReminderSystem.frequency, 'minutes (', intervalMs, 'ms)');
  
  audioReminderSystem.intervalId = setInterval(() => {
    console.log('BACKGROUND: 🔔 STANDALONE AUDIO REMINDER FIRING!');
    fireStandaloneAudioReminder();
  }, intervalMs);
  
  console.log('BACKGROUND: 🔊 Standalone audio reminder interval established with ID:', audioReminderSystem.intervalId);
}

// Stop the standalone audio reminder system
function stopStandaloneAudioReminders() {
  if (audioReminderSystem.intervalId) {
    console.log('BACKGROUND: 🔊 Stopping standalone audio reminders, interval ID:', audioReminderSystem.intervalId);
    clearInterval(audioReminderSystem.intervalId);
    audioReminderSystem.intervalId = null;
    console.log('BACKGROUND: 🔊 Standalone audio reminders stopped');
  }
}

// Fire a standalone audio reminder
function fireStandaloneAudioReminder() {
  console.log('BACKGROUND: 🔔 Firing standalone audio reminder');
  
  // First try to find the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, function(activeTabs) {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: ❌ Error querying active tab for audio reminder:', chrome.runtime.lastError);
      fireBackupAudioReminder();
      return;
    }
    
    let targetTab = null;
    
    // Check if active tab is valid for audio
    if (activeTabs.length > 0) {
      const activeTab = activeTabs[0];
      if (activeTab.url && 
          !activeTab.url.startsWith('chrome://') && 
          !activeTab.url.startsWith('chrome-extension://') &&
          !activeTab.url.startsWith('moz-extension://') &&
          !activeTab.url.startsWith('about:') &&
          !activeTab.url.startsWith('data:')) {
        targetTab = activeTab;
        console.log('BACKGROUND: 🔔 Using active tab for audio reminder:', targetTab.id);
      }
    }
    
    // If no valid active tab, get first valid tab
    if (!targetTab) {
      chrome.tabs.query({}, function(allTabs) {
        if (chrome.runtime.lastError) {
          console.error('BACKGROUND: ❌ Error querying all tabs for audio reminder:', chrome.runtime.lastError);
          fireBackupAudioReminder();
          return;
        }
        
        const validTabs = allTabs.filter(tab => 
          tab.url && 
          !tab.url.startsWith('chrome://') && 
          !tab.url.startsWith('chrome-extension://') &&
          !tab.url.startsWith('moz-extension://') &&
          !tab.url.startsWith('about:') &&
          !tab.url.startsWith('data:')
        );
        
        if (validTabs.length === 0) {
          console.log('BACKGROUND: ⚠️ No valid tabs for audio reminder - using backup');
          fireBackupAudioReminder();
          return;
        }
        
        targetTab = validTabs[0];
        console.log('BACKGROUND: 🔔 Using first valid tab for audio reminder:', targetTab.id);
        sendAudioToSingleTab(targetTab);
      });
    } else {
      sendAudioToSingleTab(targetTab);
    }
  });
}

// Helper function to send audio reminder to a single tab
function sendAudioToSingleTab(tab) {
  console.log('BACKGROUND: 🔔 Sending audio reminder to single tab:', tab.id, '(' + tab.url + ')');
  
  const messageData = {
    action: 'playStandaloneAudioReminder',
    timestamp: Date.now(),
    volume: audioReminderSystem.volume,
    customSound: audioReminderSystem.customSound,
    enabled: audioReminderSystem.enabled
  };
  
  console.log('BACKGROUND: 🔔 Audio message data:', {
    enabled: messageData.enabled,
    volume: messageData.volume,
    hasCustomSound: !!messageData.customSound,
    customSoundLength: messageData.customSound ? messageData.customSound.length : 0
  });
  
  chrome.tabs.sendMessage(tab.id, messageData).then(() => {
    console.log('BACKGROUND: ✅ Audio reminder sent successfully to tab', tab.id);
  }).catch((error) => {
    console.log('BACKGROUND: ❌ Failed to send audio reminder to tab', tab.id, ':', error.message);
    
    // Try injecting content script if missing
    if (error.message.includes('Receiving end does not exist')) {
      console.log('BACKGROUND: 🔄 Attempting to inject content script into tab', tab.id);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, messageData).then(() => {
            console.log('BACKGROUND: ✅ Audio reminder retry successful for tab', tab.id);
          }).catch(() => {
            console.log('BACKGROUND: ❌ Retry audio reminder failed for tab', tab.id, 'using backup');
            fireBackupAudioReminder();
          });
        }, 500);
      }).catch(() => {
        console.log('BACKGROUND: ❌ Could not inject content script for audio reminder, using backup');
        fireBackupAudioReminder();
      });
    } else {
      fireBackupAudioReminder();
    }
  });
}

// Backup audio reminder when no content scripts available
function fireBackupAudioReminder() {
  console.log('BACKGROUND: 🔔 Using backup audio reminder systems');
  
  try {
    // Browser notification with sound
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>',
      title: '🔔 Focus Reminder',
      message: 'Stay focused!',
      requireInteraction: false,
      silent: false
    });
    console.log('BACKGROUND: ✅ Backup notification created');
  } catch (error) {
    console.error('BACKGROUND: ❌ Backup notification failed:', error);
  }
  
  try {
    // Create temporary tab for audio
    chrome.tabs.create({
      url: chrome.runtime.getURL('newtab.html?audioReminder=true'),
      active: false
    }, (newTab) => {
      if (chrome.runtime.lastError) {
        console.error('BACKGROUND: ❌ Could not create backup audio tab:', chrome.runtime.lastError);
      } else {
        console.log('BACKGROUND: ✅ Created backup audio tab:', newTab.id);
        setTimeout(() => {
          chrome.tabs.sendMessage(newTab.id, {
            action: 'playStandaloneAudioReminder',
            timestamp: Date.now(),
            volume: audioReminderSystem.volume,
            customSound: audioReminderSystem.customSound,
            enabled: audioReminderSystem.enabled,
            isBackupTab: true
          }).catch(() => {});
        }, 1000);
        
        // Close backup tab after 3 seconds
        setTimeout(() => {
          chrome.tabs.remove(newTab.id).catch(() => {});
        }, 3000);
      }
    });
  } catch (error) {
    console.error('BACKGROUND: ❌ Backup audio tab failed:', error);
  }
}

// Save standalone audio reminder settings
function saveAudioReminderSettings() {
  chrome.storage.sync.set({
    audioReminderSystem: audioReminderSystem
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: Error saving audio reminder settings:', chrome.runtime.lastError);
    } else {
      console.log('BACKGROUND: 🔊 Audio reminder settings saved');
    }
  });
}

// =====================================
// END STANDALONE AUDIO REMINDER SYSTEM
// =====================================

// Start the global timer
function startGlobalTimer() {
  if (globalTimer.interval) return;
  
  if (globalTimer.mode === 'pomodoro') {
    globalTimer.isRunning = true;
    globalTimer.interval = setInterval(() => {
      globalTimer.timeLeft--;
      
      // Update extension icon badge
      updateIconBadge();
      
      // Broadcast to all tabs every second for real-time updates
      broadcastTimerUpdate();
      
      // Only save state every 60 seconds instead of every second, or when timer completes/low
      if (globalTimer.timeLeft % 60 === 0 || globalTimer.timeLeft <= 0 || globalTimer.timeLeft <= 5) {
        debouncedSaveTimerState();
      }
      
      if (globalTimer.timeLeft <= 0) {
        stopGlobalTimer();
        // Handle timer completion: open new tab and play double beep
        handleTimerCompletion();
      }
    }, 1000);
  } else { // Stopwatch mode
    globalTimer.isRunning = true;
    globalTimer.interval = setInterval(() => {
      globalTimer.timeLeft++; // Counting up
      
      // Update extension icon badge
      updateIconBadge();
      
      // Broadcast stopwatch updates every second for real-time updates
      broadcastTimerUpdate();
      
      // Save every 60 seconds for stopwatch
      if (globalTimer.timeLeft % 60 === 0) {
        debouncedSaveTimerState();
      }
    }, 1000);
  }
  // REMOVED: startTaskReminder() - now using standalone audio system only
  
  // Update badge for initial state
  updateIconBadge();
  debouncedSaveTimerState();
}

// Stop the global timer
function stopGlobalTimer() {
  globalTimer.isRunning = false;
  if (globalTimer.interval) {
    clearInterval(globalTimer.interval);
    globalTimer.interval = null;
  }
  // Update badge when timer stops
  updateIconBadge();
  debouncedSaveTimerState();
  // REMOVED: stopTaskReminder() - now using standalone audio system only
}

// Handle timer completion: open new tab and play double beep
function handleTimerCompletion() {
  console.log('BACKGROUND: 🎉 Timer completed! Opening new tab and playing double beep');
  
  // Update badge for completion
  updateIconBadge();
  
  // 1. Open new tab automatically
  try {
    chrome.tabs.create({
      url: chrome.runtime.getURL('newtab.html?timerComplete=true'),
      active: true // Make it the active tab
    }, (newTab) => {
      if (chrome.runtime.lastError) {
        console.error('BACKGROUND: ❌ Could not create completion tab:', chrome.runtime.lastError);
      } else {
        console.log('BACKGROUND: ✅ Created timer completion tab:', newTab.id);
      }
    });
  } catch (error) {
    console.error('BACKGROUND: ❌ Error creating completion tab:', error);
  }
  
  // 2. Play double beep to all tabs
  console.log('BACKGROUND: 🔔 Playing double beep for timer completion');
  chrome.tabs.query({ status: 'complete' }, function(tabs) {
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://')
    );
    
    console.log('BACKGROUND: Sending double beep to', validTabs.length, 'valid tabs');
    
    validTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'timerComplete',
        playDoubleBeep: true,
        timestamp: Date.now()
      }).catch(() => {
        // Silently ignore connection errors to dead tabs
      });
    });
  });
  
  // 3. Show completion notification
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon/icon128.png',
      title: '🎉 Timer Complete!',
      message: 'Great work! Time for a break.',
      requireInteraction: false,
      silent: false
    });
  } catch (error) {
    console.error('BACKGROUND: ❌ Could not create completion notification:', error);
  }
}

// Reset the global timer
function resetGlobalTimer() {
  stopGlobalTimer();
  if (globalTimer.mode === 'pomodoro') {
    globalTimer.timeLeft = globalTimer.defaultTime;
    globalTimer.currentTask = '';
  } else {
    globalTimer.timeLeft = 0;
  }
  // Update badge after reset
  updateIconBadge();
  broadcastTimerUpdate();
  debouncedSaveTimerState();
}

// Broadcast timer update to all tabs (optimized)
function broadcastTimerUpdate(source = null) {
  console.log('BACKGROUND: Broadcasting timer update, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible, 'source:', source);
  chrome.tabs.query({ status: 'complete' }, function(tabs) {
    // Filter out chrome:// and extension:// pages that can't receive messages
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://')
    );
    
    console.log('BACKGROUND: Found', validTabs.length, 'valid tabs to update (filtered from', tabs.length, 'total)');
    
    validTabs.forEach(tab => {
      const domain = extractDomain(tab.url);
      const domainVisible = isTimerVisibleOnDomain(domain);
      
      const message = {
        action: 'updateTimerDisplay',
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        enabled: globalTimer.enabled,
        timerVisible: domainVisible, // Use domain-specific visibility
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        stopwatch: stopwatch,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound,
        reminderVolume: globalTimer.reminderVolume,
        reminderEnabled: globalTimer.reminderEnabled,
        disableSource: source,
        domain: domain
      };
      
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Silently ignore connection errors to dead tabs
      });
    });
  });
}

// Broadcast timer update to tabs on a specific domain
function broadcastTimerUpdateToDomain(domain, source = '') {
  console.log('BACKGROUND: Broadcasting timer update to domain:', domain);
  
  chrome.tabs.query({}, (tabs) => {
    let domainTabsCount = 0;
    let messagesInjected = 0;
    
    tabs.forEach(async (tab) => {
      if (tab.url && extractDomain(tab.url) === domain) {
        domainTabsCount++;
        
        const timerVisible = isTimerVisibleOnDomain(domain);
        console.log(`BACKGROUND: Sending update to tab ${tab.id} on ${domain}, timerVisible:`, timerVisible);
        
        try {
          // Check if content script is ready by pinging first
          chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log(`BACKGROUND: Tab ${tab.id} not ready for ping, might need injection`);
              return;
            }
            
            // Send the actual update
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateTimerDisplay',
              enabled: globalTimer.enabled,
              isRunning: globalTimer.isRunning,
              timeLeft: globalTimer.timeLeft,
              mode: globalTimer.mode,
              timerVisible: timerVisible,
              currentTask: globalTimer.currentTask,
              reminderFrequency: globalTimer.reminderFrequency,
              reminderEnabled: globalTimer.reminderEnabled,
              reminderVolume: globalTimer.reminderVolume,
              customReminderSound: globalTimer.customReminderSound,
              stopwatch: globalTimer.stopwatch,
              disableSource: source + '-domainUpdate',
              domain: domain
            }, (updateResponse) => {
              if (chrome.runtime.lastError) {
                console.warn(`BACKGROUND: Failed to send timer update to tab ${tab.id}:`, chrome.runtime.lastError.message);
              } else {
                messagesInjected++;
                console.log(`BACKGROUND: Successfully sent timer update to tab ${tab.id}, response:`, updateResponse);
              }
            });
          });
        } catch (error) {
          console.error(`BACKGROUND: Error broadcasting to tab ${tab.id}:`, error);
        }
      }
    });
    
    console.log(`BACKGROUND: Broadcast to ${domainTabsCount} tabs on domain ${domain}`);
    setTimeout(() => {
      console.log(`BACKGROUND: Successfully sent messages to ${messagesInjected}/${domainTabsCount} tabs on ${domain}`);
    }, 100);
  });
}

// FORCE SYNC: Optimized synchronization for startup and state mismatches
function forceSyncAllTabs() {
  console.log('BACKGROUND: Force syncing all tabs with state - enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
  chrome.tabs.query({ status: 'complete' }, function(tabs) {
    // Filter valid tabs only
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://')
    );
    
    validTabs.forEach(tab => {
      const domain = extractDomain(tab.url);
      const domainVisible = isTimerVisibleOnDomain(domain);
      
      const message = {
        action: 'forceStateSync',
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        enabled: globalTimer.enabled,
        timerVisible: domainVisible, // Use domain-specific visibility
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        stopwatch: stopwatch,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound,
        reminderVolume: globalTimer.reminderVolume,
        reminderEnabled: globalTimer.reminderEnabled,
        domain: domain
      };
      
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Silently ignore connection errors
      });
    });
  });
}

function startStopwatch() {
  if (stopwatch.interval) return;
  stopwatch.isRunning = true;
  stopwatch.interval = setInterval(() => {
    stopwatch.time++;
    // Broadcast stopwatch updates every second for real-time updates
    broadcastTimerUpdate();
    // Save every 60 seconds for stopwatch
    if (stopwatch.time % 60 === 0) {
      debouncedSaveTimerState();
    }
  }, 1000);
  debouncedSaveTimerState();
}

function stopStopwatch() {
  stopwatch.isRunning = false;
  if (stopwatch.interval) {
    clearInterval(stopwatch.interval);
    stopwatch.interval = null;
  }
  debouncedSaveTimerState();
}

// Save timer state to storage
function saveTimerState() {
  console.log('BACKGROUND: Saving timer state, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
  chrome.storage.sync.set({
    timerState: {
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      defaultTime: globalTimer.defaultTime,
      currentTask: globalTimer.currentTask,
      mode: globalTimer.mode,
      reminderFrequency: globalTimer.reminderFrequency,
      customReminderSound: globalTimer.customReminderSound,
      reminderVolume: globalTimer.reminderVolume,
      reminderEnabled: globalTimer.reminderEnabled
    },
    timerEnabled: globalTimer.enabled,
    timerVisible: globalTimer.timerVisible, // Save the new state
    stopwatchState: stopwatch
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: Error saving state:', chrome.runtime.lastError);
    } else {
      console.log('BACKGROUND: State saved successfully');
    }
  });
}

// Debounced save function
function debouncedSaveTimerState() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveTimerState();
    lastSavedState = JSON.stringify(globalTimer); // Store a copy for comparison
    pendingStateChange = false;
    console.log('BACKGROUND: Debounced save triggered. State saved.');
  }, 5000); // 5 second debounce time to prevent quota issues
}

// Website Blocker Functions
function setupWebsiteBlockingListeners() {
  console.log('BACKGROUND: Setting up website blocking listeners...', {
    enabled: websiteBlockerState.isEnabled,
    blockedSites: websiteBlockerState.blockedWebsites
  });
  
  // Tab update listener for website blocking
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Always log tab updates to see if listener is working
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('BACKGROUND: Tab updated:', { 
        tabId, 
        url: tab.url, 
        blockerEnabled: websiteBlockerState.isEnabled,
        changeInfo
      });
      
      if (websiteBlockerState.isEnabled) {
        console.log('BACKGROUND: Checking if should block:', tab.url);
        if (shouldBlockWebsite(tab.url)) {
          console.log('BACKGROUND: ⛔ BLOCKING website via tab update:', tab.url);
          await blockWebsite(tabId, tab.url);
        } else {
          console.log('BACKGROUND: ✅ Website allowed:', tab.url);
        }
      } else {
        console.log('BACKGROUND: 🔓 Website blocker disabled, allowing:', tab.url);
      }
    }
  });
  
  // Before navigate listener for faster blocking
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId === 0) {
      console.log('BACKGROUND: Navigation detected:', { 
        url: details.url, 
        tabId: details.tabId,
        blockerEnabled: websiteBlockerState.isEnabled 
      });
      
      if (websiteBlockerState.isEnabled) {
        console.log('BACKGROUND: Checking navigation to:', details.url);
        if (shouldBlockWebsite(details.url)) {
          console.log('BACKGROUND: ⛔ BLOCKING navigation to:', details.url);
          await blockWebsite(details.tabId, details.url);
        } else {
          console.log('BACKGROUND: ✅ Navigation allowed to:', details.url);
        }
      } else {
        console.log('BACKGROUND: 🔓 Navigation blocker disabled, allowing:', details.url);
      }
    }
  });
  
  console.log('BACKGROUND: ✅ Website blocking listeners successfully registered');
}

function shouldBlockWebsite(url) {
  if (!websiteBlockerState.isEnabled || !url) {
    console.log('BACKGROUND: Blocking check skipped:', { 
      enabled: websiteBlockerState.isEnabled, 
      hasUrl: !!url 
    });
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    
    console.log('BACKGROUND: Checking if should block:', { 
      url, 
      hostname,
      blockedSites: websiteBlockerState.blockedWebsites 
    });
    
    const shouldBlock = websiteBlockerState.blockedWebsites.some(blocked => {
      const cleanBlocked = blocked.toLowerCase().replace(/^www\./, '');
      const matches = hostname === cleanBlocked || 
                     hostname.endsWith('.' + cleanBlocked) ||
                     cleanBlocked.includes(hostname) ||
                     hostname.includes(cleanBlocked);
      
      if (matches) {
        console.log('BACKGROUND: Match found:', { hostname, blocked: cleanBlocked });
      }
      
      return matches;
    });
    
    console.log('BACKGROUND: Should block result:', shouldBlock);
    return shouldBlock;
  } catch (error) {
    console.error('BACKGROUND: Error checking URL:', error);
    return false;
  }
}

async function blockWebsite(tabId, url) {
  try {
    // Increment blocked counter
    websiteBlockerState.blockedToday++;
    await saveWebsiteBlockerState();
    
    // Check if new tab is enabled
    chrome.storage.sync.get(['newtabEnabled'], function(result) {
      const newtabEnabled = result.newtabEnabled !== undefined ? result.newtabEnabled : true;
      
      if (newtabEnabled) {
        // Redirect to our new tab page with blocked message
        const extensionUrl = chrome.runtime.getURL('newtab.html') + '?blocked=' + encodeURIComponent(url);
        chrome.tabs.update(tabId, { url: extensionUrl });
        console.log('BACKGROUND: Successfully blocked and redirected to new tab:', url);
      } else {
        // Create a black screen using data URL
        const blackScreenHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Site Blocked</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                background: #000000;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
              }
              .blocked-message {
                max-width: 400px;
                padding: 40px;
              }
              .blocked-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #FFA500;
              }
              .blocked-url {
                font-size: 14px;
                color: #888;
                word-break: break-all;
                margin-bottom: 20px;
              }
              .blocked-info {
                font-size: 16px;
                line-height: 1.5;
                opacity: 0.8;
              }
            </style>
          </head>
          <body>
            <div class="blocked-message">
              <div class="blocked-title">🚫 Site Blocked</div>
              <div class="blocked-url">${url}</div>
              <div class="blocked-info">This website has been blocked to help you stay focused.</div>
            </div>
          </body>
          </html>
        `;
        
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(blackScreenHTML);
        chrome.tabs.update(tabId, { url: dataUrl });
        console.log('BACKGROUND: Successfully blocked and redirected to black screen:', url);
      }
    });
  } catch (error) {
    console.error('BACKGROUND: Error blocking website:', error);
  }
}

function saveWebsiteBlockerState() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ websiteBlockerSettings: websiteBlockerState }, function() {
      if (chrome.runtime.lastError) {
        console.error('BACKGROUND: Error saving website blocker state:', chrome.runtime.lastError);
      } else {
        console.log('BACKGROUND: Website blocker state saved successfully');
      }
      resolve();
    });
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
      // Get domain-specific visibility if sender tab is available
      let timerVisible = globalTimer.timerVisible; // Default fallback
      if (sender.tab && sender.tab.url) {
        const domain = extractDomain(sender.tab.url);
        timerVisible = isTimerVisibleOnDomain(domain);
        console.log('BACKGROUND: getTimerState for domain:', domain, 'visible:', timerVisible);
      }
      
      const state = {
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        defaultTime: globalTimer.defaultTime,
        enabled: globalTimer.enabled,
        timerVisible: timerVisible, // Use domain-specific visibility
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound,
        reminderVolume: globalTimer.reminderVolume,
        reminderEnabled: globalTimer.reminderEnabled
      };
      console.log('BACKGROUND: Sending timer state:', state);
      sendResponse(state);
      break;
      
    case 'startTimer':
      console.log('BACKGROUND: Starting timer, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
      if (globalTimer.enabled) {
        startGlobalTimer();
        broadcastTimerUpdate();
        
        // AUTO-ENABLE BLOCKER: When a new session starts, automatically enable website blocker
        if (!websiteBlockerState.isEnabled) {
          console.log('BACKGROUND: 🔒 Auto-enabling website blocker for new focus session');
          websiteBlockerState.isEnabled = true;
          saveWebsiteBlockerState();
          
          // Notify popup about the blocker being enabled
          chrome.runtime.sendMessage({ 
            action: 'blockerAutoEnabled', 
            enabled: true, 
            blockedWebsites: websiteBlockerState.blockedWebsites 
          }).catch(() => {
            // Ignore errors if popup is not open
          });
        } else {
          console.log('BACKGROUND: Website blocker already enabled for focus session');
        }
      }
      sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'stopTimer':
      console.log('BACKGROUND: Stopping timer');
      stopGlobalTimer();
      broadcastTimerUpdate();
      sendResponse({ success: true });
      break;
      
    case 'resetTimer':
      console.log('BACKGROUND: Resetting timer');
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'switchMode':
      console.log('BACKGROUND: Switching mode from', globalTimer.mode);
      stopGlobalTimer();
      if (globalTimer.mode === 'pomodoro') {
        globalTimer.mode = 'stopwatch';
        globalTimer.timeLeft = 0;
      } else {
        globalTimer.mode = 'pomodoro';
        globalTimer.timeLeft = globalTimer.defaultTime;
      }
      // Update badge when mode changes
      updateIconBadge();
      broadcastTimerUpdate();
      debouncedSaveTimerState();
      sendResponse({ success: true, mode: globalTimer.mode });
      break;
      
    case 'updateDuration':
      console.log('BACKGROUND: Updating duration to', request.duration, 'minutes');
      globalTimer.defaultTime = request.duration * 60;
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'setTask':
      console.log('BACKGROUND: Setting task to:', request.task);
      const previousTask = globalTimer.currentTask;
      globalTimer.currentTask = request.task;
      
      console.log('BACKGROUND: Task changed from "' + previousTask + '" to "' + globalTimer.currentTask + '"');
      
      // Auto-show timer when setting a task if reminders are enabled
      if (globalTimer.currentTask && globalTimer.reminderEnabled && globalTimer.reminderFrequency > 0) {
        console.log('BACKGROUND: 🔄 Auto-showing timer for task with reminders');
        globalTimer.timerVisible = true;
      }
      
      // ✅ FIXED: No longer starting old task reminder system - using standalone audio only
      console.log('BACKGROUND: ✅ Task set successfully - standalone audio reminder system handles audio');
      debouncedSaveTimerState();
      broadcastTimerUpdate();
      sendResponse({ success: true, task: globalTimer.currentTask });
      break;
      
    case 'toggleEnabled':
      // This is for the popup toggle - controls the main enabled state
      console.log('BACKGROUND: Toggle enabled from', globalTimer.enabled, 'to', request.enabled, 'source:', request.source);
      globalTimer.enabled = request.enabled;
      // When disabled via popup, also hide the timer
      if (!request.enabled) {
        globalTimer.timerVisible = false;
      } else {
        // When enabled via popup, make timer visible
        globalTimer.timerVisible = true;
      }
      // Update badge when enabled state changes
      updateIconBadge();
      debouncedSaveTimerState();
      broadcastTimerUpdate(request.source === 'popupToggle' ? 'popupToggle' : request.source);
      sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'toggleVisible':
      // This is for the X button - domain-specific visibility control
      console.log('BACKGROUND: 🔄 Toggle visible from', globalTimer.timerVisible, 'to', request.visible, 'source:', request.source);
      
      if (sender.tab && sender.tab.url) {
        const domain = extractDomain(sender.tab.url);
        console.log('BACKGROUND: 📍 Domain extracted for visibility toggle:', domain, 'URL:', sender.tab.url);
        
        if (domain) {
          const wasVisibleBefore = isTimerVisibleOnDomain(domain);
          console.log('BACKGROUND: 📊 Before toggle - domain visibility:', wasVisibleBefore, 'hiddenDomains:', Array.from(hiddenDomains));
          
          if (request.visible) {
            console.log('BACKGROUND: ✅ Showing timer on domain:', domain);
            showTimerOnDomain(domain);
          } else {
            console.log('BACKGROUND: ❌ Hiding timer on domain:', domain);
            hideTimerOnDomain(domain);
          }
          
          const isVisibleAfter = isTimerVisibleOnDomain(domain);
          console.log('BACKGROUND: 📊 After toggle - domain visibility:', isVisibleAfter, 'hiddenDomains:', Array.from(hiddenDomains));
          console.log('BACKGROUND: 🚀 Broadcasting update to domain:', domain, 'with timerVisible:', isVisibleAfter);
          
          // Broadcast update only to tabs on the same domain
          broadcastTimerUpdateToDomain(domain, request.source);
          
          // Send immediate response
          sendResponse({ 
            success: true, 
            enabled: globalTimer.enabled, 
            timerVisible: isVisibleAfter, 
            domain: domain,
            action: request.visible ? 'show' : 'hide',
            wasVisible: wasVisibleBefore
          });
        } else {
          console.warn('BACKGROUND: ⚠️ Domain extraction failed, falling back to global behavior');
          // Fallback to global behavior if domain extraction fails
          globalTimer.timerVisible = request.visible;
          debouncedSaveTimerState();
          broadcastTimerUpdate(request.source);
          sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible, fallback: true });
        }
      } else {
        console.warn('BACKGROUND: ⚠️ No tab info available, falling back to global behavior');
        // Fallback to global behavior if no tab info
        globalTimer.timerVisible = request.visible;
        debouncedSaveTimerState();
        broadcastTimerUpdate(request.source);
        sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible, fallback: true });
      }
      break;
      
    case 'getEnabled':
      sendResponse({ enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'toggleStopwatch':
      console.log('BACKGROUND: Toggling stopwatch');
      if (stopwatch.isRunning) {
        stopStopwatch();
      } else {
        startStopwatch();
      }
      sendResponse({ success: true });
      break;
      
    case 'updateReminderFrequency':
      console.log('BACKGROUND: Updating reminder frequency to', request.frequency);
      globalTimer.reminderFrequency = request.frequency;
      if (globalTimer.isRunning && globalTimer.reminderEnabled && globalTimer.reminderFrequency > 0) {
        // The standalone audio system handles reminders, so no need to restart here
      } else {
        // If frequency is 0, stop reminders
        stopStandaloneAudioReminders();
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate();
      sendResponse({ success: true });
      break;
      
    case 'setCustomSound':
        console.log('BACKGROUND: Setting custom sound');
        globalTimer.customReminderSound = request.sound;
        debouncedSaveTimerState();
        sendResponse({ success: true });
        break;

    case 'removeCustomSound':
        console.log('BACKGROUND: Removing custom sound');
        globalTimer.customReminderSound = null;
        debouncedSaveTimerState();
        broadcastTimerUpdate();
        sendResponse({ success: true });
        break;
        
    case 'updateReminderVolume':
        console.log('BACKGROUND: Updating reminder volume to', request.volume);
        globalTimer.reminderVolume = Math.max(0, Math.min(1, request.volume)); // Clamp between 0 and 1
        debouncedSaveTimerState();
        broadcastTimerUpdate();
        sendResponse({ success: true });
        break;
        
    case 'toggleReminderEnabled':
        console.log('BACKGROUND: Toggling reminder enabled to', request.enabled);
        globalTimer.reminderEnabled = request.enabled;
        if (!request.enabled) {
            stopStandaloneAudioReminders(); // Stop reminders if disabled
        } else if (globalTimer.isRunning && globalTimer.reminderFrequency > 0) {
            startStandaloneAudioReminders(); // Start reminders if enabled and conditions are met
        }
        debouncedSaveTimerState();
        broadcastTimerUpdate();
        sendResponse({ success: true });
        break;
        
    // =====================================
    // STANDALONE AUDIO REMINDER HANDLERS
    // =====================================
    
    case 'toggleStandaloneAudioReminder':
        console.log('BACKGROUND: 🔊 Toggling standalone audio reminder to', request.enabled);
        audioReminderSystem.enabled = request.enabled;
        if (request.enabled && audioReminderSystem.frequency > 0) {
            startStandaloneAudioReminders();
        } else {
            stopStandaloneAudioReminders();
        }
        saveAudioReminderSettings();
        sendResponse({ success: true, enabled: audioReminderSystem.enabled });
        break;
        
    case 'updateStandaloneAudioFrequency':
        console.log('BACKGROUND: 🔊 Updating standalone audio frequency to', request.frequency);
        audioReminderSystem.frequency = Math.max(0, Math.min(60, request.frequency));
        if (audioReminderSystem.enabled && audioReminderSystem.frequency > 0) {
            startStandaloneAudioReminders(); // Restart with new frequency
        } else {
            stopStandaloneAudioReminders();
        }
        saveAudioReminderSettings();
        sendResponse({ success: true, frequency: audioReminderSystem.frequency });
        break;
        
    case 'updateStandaloneAudioVolume':
        console.log('BACKGROUND: 🔊 Updating standalone audio volume to', request.volume);
        audioReminderSystem.volume = Math.max(0, Math.min(1, request.volume));
        saveAudioReminderSettings();
        sendResponse({ success: true, volume: audioReminderSystem.volume });
        break;
        
    case 'setStandaloneAudioCustomSound':
        console.log('BACKGROUND: �� Setting standalone audio custom sound');
        audioReminderSystem.customSound = request.sound;
        saveAudioReminderSettings();
        sendResponse({ success: true });
        break;
        
    case 'removeStandaloneAudioCustomSound':
        console.log('BACKGROUND: 🔊 Removing standalone audio custom sound');
        audioReminderSystem.customSound = null;
        saveAudioReminderSettings();
        sendResponse({ success: true });
        break;
        
    case 'getStandaloneAudioState':
        console.log('BACKGROUND: 🔊 Getting standalone audio state');
        sendResponse({
            enabled: audioReminderSystem.enabled,
            frequency: audioReminderSystem.frequency,
            volume: audioReminderSystem.volume,
            customSound: audioReminderSystem.customSound,
            hasCustomSound: !!audioReminderSystem.customSound
        });
        break;
        
    // =====================================
    // END STANDALONE AUDIO REMINDER HANDLERS
    // =====================================
        
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
      console.log('BACKGROUND: Current stored visible state before update:', globalTimer.timerVisible);
      console.log('BACKGROUND: Timer says it is actually visible:', request.actuallyVisible);
      
      // CRITICAL FIX: Ensure we only accept boolean values, never null/undefined
      if (typeof request.actuallyVisible === 'boolean') {
        // Timer is the authority for visibility - if it reports different state, sync everything
        if (globalTimer.timerVisible !== request.actuallyVisible) {
          console.log('BACKGROUND: Timer visibility mismatch detected! Timer says:', request.actuallyVisible, 'Background says:', globalTimer.timerVisible);
          console.log('BACKGROUND: Updating stored visible state to match timer reality:', request.actuallyVisible);
          globalTimer.timerVisible = request.actuallyVisible;
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
      console.log('BACKGROUND: Toggling website blocker to:', request.enabled);
      websiteBlockerState.isEnabled = request.enabled;
      websiteBlockerState.blockedWebsites = request.blockedWebsites || websiteBlockerState.blockedWebsites;
      saveWebsiteBlockerState();
      sendResponse({ success: true, enabled: websiteBlockerState.isEnabled });
      break;
      
    case 'updateWebsiteBlocker':
      console.log('BACKGROUND: Updating website blocker settings');
      websiteBlockerState.isEnabled = request.enabled;
      websiteBlockerState.blockedWebsites = request.blockedWebsites || [];
      saveWebsiteBlockerState();
      sendResponse({ success: true, enabled: websiteBlockerState.isEnabled, blockedWebsites: websiteBlockerState.blockedWebsites });
      break;
      
    case 'getWebsiteBlockerState':
      sendResponse({ 
        isEnabled: websiteBlockerState.isEnabled,
        blockedWebsites: websiteBlockerState.blockedWebsites,
        blockedToday: websiteBlockerState.blockedToday
      });
      break;
      
    case 'testWebsiteBlocking':
      console.log('BACKGROUND: Testing website blocking for:', request.url);
      const testResult = shouldBlockWebsite(request.url);
      console.log('BACKGROUND: Test result for', request.url, ':', testResult);
      sendResponse({ 
        url: request.url,
        shouldBlock: testResult,
        enabled: websiteBlockerState.isEnabled,
        blockedSites: websiteBlockerState.blockedWebsites
      });
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

// =====================================
// EXTENSION ICON BADGE FUNCTIONS
// =====================================

// Update extension icon badge with current timer minutes
function updateIconBadge() {
  if (!globalTimer.enabled) {
    // Clear badge when timer is disabled
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
    return;
  }
  
  let minutes;
  let badgeColor = '#FFA500'; // Default orange
  
  if (globalTimer.mode === 'pomodoro') {
    minutes = Math.ceil(Math.max(0, globalTimer.timeLeft) / 60);
    if (globalTimer.isRunning) {
      badgeColor = globalTimer.timeLeft <= 300 ? '#FF4444' : '#FFA500'; // Red if ≤5 minutes, orange otherwise
    } else {
      badgeColor = '#888888'; // Gray when paused
    }
  } else { // stopwatch mode
    minutes = Math.floor(globalTimer.timeLeft / 60);
    badgeColor = globalTimer.isRunning ? '#00AA00' : '#888888'; // Green when running, gray when paused
  }
  
  // Limit display to 99+ for large numbers
  const badgeText = minutes > 99 ? '99+' : minutes.toString();
  
  console.log('BACKGROUND: 🏷️ Updating badge:', badgeText, 'minutes, color:', badgeColor);
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
}

// =====================================
// END EXTENSION ICON BADGE FUNCTIONS
// =====================================