// Built-in Extensions Manager - Focus Mode Bottom Bar
class BuiltinExtensionsManager {
  constructor() {
    this.settings = {};
    this.currentScreen = 'main'; // Track current screen
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Builtin Extensions Manager...');
    await this.loadSettings();
    this.detectCurrentScreen();
    this.setupEventListeners();
    
    // Only create bottom bar on main screen
    if (this.currentScreen === 'main') {
      console.log('✅ On main screen, creating bottom bar...');
      this.createBottomBar();
    } else {
      console.log(`🚫 Not on main screen (${this.currentScreen}), bottom bar will not be shown`);
      // Ensure any existing bar is completely removed
      this.removeBottomBar();
    }
    
    // Fallback: Only try to create bottom bar if we're definitely on main screen
    setTimeout(() => {
      if (this.currentScreen === 'main') {
        const existingBar = document.querySelector('.builtin-extensions-bar');
        if (!existingBar) {
          console.log('🔄 Main screen detected but no bottom bar found, creating fallback bar...');
          this.createBottomBar();
        } else {
          console.log('✅ Bottom bar exists on main screen');
        }
      } else {
        // Make sure no bar exists on non-main screens
        this.removeBottomBar();
      }
    }, 1000);
    
    console.log('✅ Builtin Extensions Manager initialized');
  }

  // Whitelist-based screen detection - only show bottom bar on main dashboard
  detectCurrentScreen() {
    const url = window.location.href;
    const body = document.body;
    
    console.log(`🔍 Detecting screen - URL: ${url}`);
    console.log(`🔍 Body classes: ${body.className}`);
    
    // Check for specific screens that should hide the bottom bar
    
    // Website blocker screen (Stay Focused page)
    if (body.querySelector('#website-blocker-screen:not(.hidden)')) {
      this.currentScreen = 'blocker';
      console.log(`📍 Detected: ${this.currentScreen} screen (website blocker visible)`);
      return;
    }
    
    // Extension details/view screen
    if (url.includes('#extension/') || body.querySelector('#extension-details-screen:not(.hidden)')) {
      this.currentScreen = 'extension';
      console.log(`📍 Detected: ${this.currentScreen} screen`);
      return;
    }
    
    // Extension creation screen
    if (url.includes('#create') || body.querySelector('#creation-screen:not(.hidden)')) {
      this.currentScreen = 'create';
      console.log(`📍 Detected: ${this.currentScreen} screen`);
      return;
    }
    
    // Extension questions/step pages
    if (url.includes('#question') || url.includes('#step-') || 
        body.querySelector('#step-2:not(.hidden)') || 
        body.querySelector('.question-generator-container')) {
      this.currentScreen = 'question';
      console.log(`📍 Detected: ${this.currentScreen} screen`);
      return;
    }
    
    // Settings screen
    if (url.includes('#settings') || body.querySelector('#settings-screen:not(.hidden)')) {
      this.currentScreen = 'settings';
      console.log(`📍 Detected: ${this.currentScreen} screen`);
      return;
    }
    
    // Auth screen
    if (body.querySelector('#auth-screen:not(.hidden)')) {
      this.currentScreen = 'auth';
      console.log(`📍 Detected: ${this.currentScreen} screen`);
      return;
    }
    
    // Only show bottom bar on main dashboard - be very specific
    if (!url.includes('#') || url === window.location.origin + window.location.pathname || 
        body.querySelector('#main-screen:not(.hidden)') ||
        body.querySelector('.main-dashboard') ||
        body.querySelector('.extensions-grid')) {
      this.currentScreen = 'main';
      console.log(`📍 Detected: ${this.currentScreen} screen - bottom bar should be visible`);
      return;
    }
    
    // Default to 'other' for any unrecognized screens (no bottom bar)
    this.currentScreen = 'other';
    console.log(`📍 Detected: ${this.currentScreen} screen - no bottom bar`);
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['websiteBlockerSettings']);
      
      // CRITICAL FIX: Don't overwrite existing settings, only set defaults for missing properties
      if (result.websiteBlockerSettings) {
        this.settings = result.websiteBlockerSettings;
      } else {
        // Only set defaults if no settings exist at all
        this.settings = {
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
        
        // Save the default settings
        await this.saveSettings();
      }
      
      console.log('🔧 Builtin extensions settings loaded:', this.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { 
        isEnabled: false, 
        blockedWebsites: ['youtube.com', 'tiktok.com', 'instagram.com', 'x.com', 'twitter.com', 'facebook.com', 'reddit.com'], 
        blockedToday: 0, 
        granularBlocks: {
          youtubeRecommendations: false,
          twitterTimeline: false,
          instagramReels: false
        }
      };
    }
  }

  async saveSettings() {
    try {
      // CRITICAL FIX: Only save if we have valid settings to avoid corrupting other components' data
      if (this.settings && typeof this.settings === 'object') {
        await chrome.storage.local.set({ websiteBlockerSettings: this.settings });
        console.log('💾 Builtin extensions settings saved:', this.settings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  createBottomBar() {
    console.log(`🔨 Creating bottom bar (current screen: ${this.currentScreen})`);

    // Remove existing bar if present
    this.removeBottomBar();

    const bar = document.createElement('div');
    bar.className = 'builtin-extensions-bar';
    bar.innerHTML = this.generateBarHTML();
    
    document.body.appendChild(bar);
    
    // Add padding to main content to account for bottom bar
    this.adjustMainContentPadding(true);
    
    // Setup event listeners for the bottom bar
    this.setupBottomBarEventListeners(bar);

    console.log('✅ Focus Mode bottom bar created and added to DOM');
  }

  // Method to completely remove bottom bar
  removeBottomBar() {
    const existingBars = document.querySelectorAll('.builtin-extensions-bar');
    existingBars.forEach(bar => {
      bar.remove();
    });
    if (existingBars.length > 0) {
      console.log('🗑️ Removed existing bottom bar(s)');
      // Remove padding from main content when bar is removed
      this.adjustMainContentPadding(false);
    }
  }

  // Method to adjust main content padding based on bottom bar presence
  adjustMainContentPadding(hasBottomBar) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      if (hasBottomBar) {
        mainContent.style.paddingBottom = '100px'; // Account for bottom bar height
        console.log('📐 Added bottom padding to main content for bottom bar');
      } else {
        mainContent.style.paddingBottom = '16px'; // Reset to normal padding
        console.log('📐 Reset main content padding (no bottom bar)');
      }
    }
  }

  // Setup event listeners for the bottom bar
  setupBottomBarEventListeners(bar) {
    // Make whole bar clickable to navigate to website blocker details
    bar.addEventListener('click', (e) => {
      // Don't trigger if clicking on toggle
      if (!e.target.closest('.focus-mode-toggle')) {
        this.showWebsiteBlockerDetails();
      }
    });

    // Setup toggle functionality
    const toggle = bar.querySelector('.focus-mode-toggle input[type="checkbox"]');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        e.stopPropagation(); // Prevent bar click
        console.log(`🔄 Bottom bar toggle changed: ${e.target.checked}`);
        this.toggleWebsiteBlocker(e.target.checked);
      });
      
      // Also handle click on the toggle switch itself
      const toggleSwitch = bar.querySelector('.toggle-switch');
      if (toggleSwitch) {
        toggleSwitch.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent bar click
        });
      }
    }
  }

  generateBarHTML() {
    const websiteBlockerEnabled = this.settings.isEnabled || false;
    const statusText = websiteBlockerEnabled ? 'Active' : 'Inactive';
    
    // Get blocked websites data with proper icons
    const blockedWebsites = this.getBlockedWebsitesData();
    const todayCount = this.settings.blockedToday || 0; // Use actual blocked count today
    const attentionSaved = this.getAttentionSavedMetric(); // Keep for future use if needed

    return `
      <div class="builtin-extensions-header">
        <div class="builtin-extensions-title">Focus Mode - ${statusText}</div>
      </div>
      <div class="builtin-extensions-container">
        <div class="focus-mode-interface">
          <div class="focus-mode-content">
            <div class="focus-mode-info">
              <!-- Removed sitting emoji as requested -->
              <div class="focus-mode-stats">
                <div class="stat-item">
                  <div class="stat-number">${todayCount}</div>
                  <div class="stat-label">ATTEMPTS SAVED</div>
                </div>
              </div>
              ${this.generateBlockedWebsiteIcons(blockedWebsites)}
            </div>
            <div class="focus-mode-controls">
              <div class="focus-mode-toggle">
                <label class="toggle-switch ${websiteBlockerEnabled ? 'active' : ''}" onclick="event.stopPropagation();">
                  <input type="checkbox" ${websiteBlockerEnabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // New method to calculate attention saved metric
  getAttentionSavedMetric() {
    const blockedToday = this.settings.blockedToday || 0;
    const blockedWebsites = this.getBlockedWebsitesData().length;
    
    // Calculate attention saved based on blocks today and enabled websites
    // Each block saves approximately 5-15 minutes of attention
    // Use a simple formula: blocked today + (enabled sites * 2) to show meaningful numbers
    const baseAttention = Math.min(blockedToday * 8, 120); // Cap daily blocks contribution
    const websiteContribution = blockedWebsites * 12; // Each enabled site contributes
    
    return Math.max(baseAttention + websiteContribution, blockedWebsites > 0 ? 15 : 0);
  }

  generateBlockedWebsiteIcons(blockedWebsites) {
    if (blockedWebsites.length === 0) {
      return '';
    }
    
    // Show up to 6 icons, then show count
    const maxIcons = 6;
    const iconsToShow = blockedWebsites.slice(0, maxIcons);
    const remainingCount = Math.max(0, blockedWebsites.length - maxIcons);

    const icons = iconsToShow.map(site => {
      return this.createLogoWithFallbacks(site.logo, site.fallbackLogos || [], site.name);
    }).join('');

    const countText = remainingCount > 0 ? `<span class="blocked-sites-count">+${remainingCount}</span>` : '';

    return `
      <div class="blocked-websites-icons">
        ${icons}
        ${countText}
      </div>
    `;
  }

  createLogoWithFallbacks(primaryLogo, fallbackLogos, altText) {
    // Enhanced fallback system with multiple Facebook logo options
    const allLogos = [primaryLogo, ...fallbackLogos];
    const fallbacksString = allLogos.map(logo => `'${logo}'`).join(', ');
    
    return `
      <img src="${primaryLogo}" alt="${altText}" class="blocked-site-icon" title="${altText}"
           onerror="this.loadFallback = this.loadFallback || 0; 
                    const fallbacks = [${fallbacksString}]; 
                    this.loadFallback++; 
                    if (this.loadFallback < fallbacks.length) { 
                      this.src = fallbacks[this.loadFallback]; 
                    } else { 
                      // Show letter as final fallback
                      this.style.display='none';
                      const letter = document.createElement('div');
                      letter.className = 'blocked-site-letter';
                      letter.textContent = '${altText.charAt(0)}';
                      letter.title = '${altText}';
                      this.parentNode.insertBefore(letter, this.nextSibling);
                    }">
    `;
  }

  getBlockedWebsitesData() {
    // Enhanced website data with proper Facebook logo fallbacks and other logos
    const defaultSites = [
      { 
        url: 'youtube.com', 
        name: 'YouTube', 
        logo: 'https://www.youtube.com/favicon.ico',
        fallbackLogos: [
          'https://s.ytimg.com/yts/img/favicon_32-vflOogEID.png',
          'https://www.gstatic.com/youtube/img/branding/favicon/favicon_32x32.png'
        ]
      },
      { 
        url: 'tiktok.com', 
        name: 'TikTok', 
        logo: 'https://www.tiktok.com/favicon.ico',
        fallbackLogos: [
          'https://lf16-tiktok-common.ttwstatic.com/obj/tiktok-web-common-sg/ies/falcon/_next/static/media/favicon.7b2b4bc6.ico'
        ]
      },
      { 
        url: 'instagram.com', 
        name: 'Instagram', 
        logo: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png',
        fallbackLogos: [
          'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico'
        ]
      },
      { 
        url: 'x.com', 
        name: 'X', 
        logo: 'https://abs.twimg.com/favicons/twitter.3.ico',
        fallbackLogos: [
          'https://abs.twimg.com/favicons/twitter.2.ico'
        ]
      },
      { 
        url: 'facebook.com', 
        name: 'Facebook', 
        logo: 'https://www.facebook.com/favicon.ico',
        fallbackLogos: [
          'https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico',
          'https://static.xx.fbcdn.net/rsrc.php/yz/r/KibfRRbptXL.ico',
          'https://facebook.com/favicon.ico',
          'https://m.facebook.com/favicon.ico',
          'https://static.facebook.com/rsrc.php/v3/yb/r/hLRJ1GG_y0J.ico',
          'https://www.facebookbrand.com/wp-content/uploads/2019/04/f_logo_RGB-Hex-Blue_512.png',
          // Simple blue Facebook "f" logo as SVG fallback
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzE4NzdGMiIvPgo8cGF0aCBkPSJNMjAuNSAxMi41SDEzLjVWOS41SDE2VjYuNUgxMy41VjUuNUgxN1YyLjVIMTAuNVYyOS41SDEzLjVWMTYuNUgyMC41VjEyLjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4='
        ]
      },
      { 
        url: 'reddit.com', 
        name: 'Reddit', 
        logo: 'https://www.reddit.com/favicon.ico',
        fallbackLogos: [
          'https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png'
        ]
      }
    ];
    
    // Filter based on actually blocked websites
    if (this.settings.blockedWebsites && this.settings.blockedWebsites.length > 0) {
      return defaultSites.filter(site => 
        this.settings.blockedWebsites.some(blocked => 
          blocked.toLowerCase().includes(site.url.replace('.com', '')) || 
          site.url.toLowerCase().includes(blocked.toLowerCase().replace('.com', ''))
        )
      );
    }

    // Return default sites if website blocker is enabled but no specific sites configured
    return this.settings.isEnabled ? defaultSites : [];
  }

  async toggleWebsiteBlocker(enabled) {
    console.log(`🔄 Toggling Website Blocker: ${enabled ? 'ON' : 'OFF'}`);
    
    try {
      // CRITICAL FIX: Always reload current settings before making changes to avoid conflicts
      await this.loadSettings();
      
      // Update internal settings
      this.settings.isEnabled = enabled;
      await this.saveSettings();

      // Update toggle appearance immediately for smooth UX
      const toggleSwitch = document.querySelector('.builtin-extensions-bar .toggle-switch');
      const checkbox = toggleSwitch?.querySelector('input[type="checkbox"]');
      
      if (toggleSwitch && checkbox) {
        toggleSwitch.classList.toggle('active', enabled);
        checkbox.checked = enabled;
      }

      // Notify background script with the updated settings (critical fix)
      await chrome.runtime.sendMessage({
        type: 'BUILTIN_EXTENSION_TOGGLE',
        extensionId: 'website-blocker',
        enabled: enabled,
        settings: this.settings // Pass the updated settings
      });

      // Also send the specific website blocker toggle message for immediate effect
      await chrome.runtime.sendMessage({
        type: 'WEBSITE_BLOCKER_TOGGLE',
        enabled: enabled,
        settings: this.settings
      });

      // Update website blocker manager if available in sidepanel context
      if (window.websiteBlockerManager) {
        window.websiteBlockerManager.settings.isEnabled = enabled;
        await window.websiteBlockerManager.saveSettings();
        
        // Sync internal toggles
        const internalToggle = document.querySelector('#website-blocker-main-toggle');
        if (internalToggle) {
          internalToggle.checked = enabled;
          const internalToggleSwitch = internalToggle.closest('.main-toggle-switch');
          if (internalToggleSwitch) {
            internalToggleSwitch.classList.toggle('active', enabled);
          }
        }
      }

      // Refresh the bottom bar to show updated state
      this.updateBottomBar();
      
      console.log(`✅ Website Blocker ${enabled ? 'enabled' : 'disabled'} from external toggle`);
      
    } catch (error) {
      console.error('❌ Error toggling website blocker from external toggle:', error);
      
      // Revert toggle state on error
      const toggleSwitch = document.querySelector('.builtin-extensions-bar .toggle-switch');
      const checkbox = toggleSwitch?.querySelector('input[type="checkbox"]');
      
      if (toggleSwitch && checkbox) {
        toggleSwitch.classList.toggle('active', !enabled);
        checkbox.checked = !enabled;
        this.settings.isEnabled = !enabled; // Revert internal state
      }
    }
  }

  updateBottomBar() {
    const bar = document.querySelector('.builtin-extensions-bar');
    if (bar && this.currentScreen === 'main') {
      bar.innerHTML = this.generateBarHTML();
    }
  }

  showWebsiteBlockerDetails() {
    console.log('📖 Opening Website Blocker details...');
    
    if (window.websiteBlockerManager && typeof window.websiteBlockerManager.showUI === 'function') {
      window.websiteBlockerManager.showUI();
    } else if (window.brainRotBlockManager && typeof window.brainRotBlockManager.showUI === 'function') {
      // Fallback for backwards compatibility
      window.brainRotBlockManager.showUI();
    } else {
      console.log('⚠️ Website Blocker Manager not available');
    }
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Watch for DOM changes to detect screen transitions
    const observer = new MutationObserver(() => {
      const oldScreen = this.currentScreen;
      this.detectCurrentScreen();
      
      if (oldScreen !== this.currentScreen) {
        console.log(`🔄 Screen changed from ${oldScreen} to ${this.currentScreen}`);
        
        // Only show bottom bar on main screen, hide on all others
        if (this.currentScreen === 'main') {
          console.log('✅ Switched to main screen, creating bottom bar...');
          setTimeout(() => this.createBottomBar(), 100);
        } else {
          // Completely remove bar on any non-main screen
          this.removeBottomBar();
          console.log(`🚫 Bottom bar completely removed (switched to ${this.currentScreen} screen)`);
        }
      }
    });
    
    // Observe changes to body and its children
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Also listen for hash changes
    window.addEventListener('hashchange', () => {
      console.log('🔄 Hash changed, re-detecting screen...');
      setTimeout(() => {
        const oldScreen = this.currentScreen;
        this.detectCurrentScreen();
        
        if (oldScreen !== this.currentScreen) {
          console.log(`🔄 Screen changed from ${oldScreen} to ${this.currentScreen} (hash change)`);
          
          // Only show on main screen, hide on all others
          if (this.currentScreen === 'main') {
            console.log('✅ Switched to main screen via hash, creating bottom bar...');
            setTimeout(() => this.createBottomBar(), 200);
          } else {
            this.removeBottomBar();
            console.log(`🚫 Bottom bar completely removed via hash change (${this.currentScreen} screen)`);
          }
        }
      }, 100);
    });
    
    console.log('✅ Event listeners set up');
  }
}

// Initialize Built-in Extensions Manager
let builtinExtensionsManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    builtinExtensionsManager = new BuiltinExtensionsManager();
  });
} else {
  builtinExtensionsManager = new BuiltinExtensionsManager();
}

// Make it globally accessible
window.builtinExtensionsManager = builtinExtensionsManager; 