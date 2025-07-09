// Website Blocker Extension
// Manages website blocking and distracting content filtering

class WebsiteBlockerManager {
  constructor() {
    this.settings = {
      blockedWebsites: [],
      customBlockImage: null,
      isEnabled: false,
      blockedToday: 0,
      granularBlocks: {
        youtubeHomepage: false,
        youtubeRecommendations: false,
        instagramReels: false,
        tiktokFeed: false,
        facebookFeed: false,
        twitterTimeline: false,
        redditFeed: false
      }
    };
    
    this.defaultBlockedSites = [
      'youtube.com',
      'tiktok.com',
      'instagram.com',
      'x.com',
      'twitter.com',
      'facebook.com',
      'reddit.com',
      'twitch.tv'
    ];
    
    // Enhanced platform-specific blocking rules
    this.platformBlockingRules = {
      // YouTube - Block homepage recommendations and sidebar
      'youtube.com': {
        css: `
          /* Hide YouTube homepage feed */
          ytd-browse[page-subtype="home"] #contents ytd-rich-grid-renderer,
          ytd-browse[page-subtype="home"] #contents ytd-rich-section-renderer,
          ytd-two-column-browse-results-renderer #primary,
          ytd-browse[page-subtype="home"] #primary,
          .ytd-browse[page-subtype="home"] #contents,
          ytd-rich-grid-renderer ytd-rich-item-renderer,
          ytd-rich-grid-row #contents,
          ytd-rich-section-renderer,
          ytd-shelf-renderer,
          
          /* Hide recommended videos in sidebar */
          ytd-watch-next-secondary-results-renderer,
          #related,
          #watch-sidebar,
          .watch-sidebar,
          
          /* Hide homepage chips/filters */
          ytd-feed-filter-chip-bar-renderer,
          
          /* Hide shorts shelf */
          ytd-rich-shelf-renderer[is-shorts],
          ytd-reel-shelf-renderer,
          
          /* Hide trending and explore */
          ytd-browse[page-subtype="trending"],
          a[href="/feed/trending"],
          
          /* Hide suggestions at video end */
          .ytp-endscreen-content,
          .ytp-ce-video,
          .ytp-ce-channel {
            display: none !important;
          }
        `
      },
      
      // X (Twitter) - Block For You and Following feeds
      'x.com': {
        css: `
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
        `
      },
      
      // Twitter (legacy)
      'twitter.com': {
        css: `
          /* Hide main timeline */
          [data-testid="primaryColumn"] [aria-label*="Timeline"],
          [data-testid="primaryColumn"] section[role="region"],
          [data-testid="primaryColumn"] article,
          
          /* Hide promoted content */
          [data-testid="placementTracking"],
          div[data-testid="placementTracking"]:has(path[d*="M19.498 3h-15c-1.381 0-2.5 1.12-2.5 2.5v13c0 1.38 1.119 2.5 2.5 2.5h15c1.381 0 2.5-1.12 2.5-2.5v-13c0-1.38-1.119-2.5-2.5-2.5z"]) {
            display: none !important;
          }
        `
      },
      
      // Instagram - Hide Reels icon and feed
      'instagram.com': {
        css: `
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
          a[aria-label*="Reels"],
          
          /* Hide explore page distracting content */
          main[role="main"] article,
          section[role="main"] > div > div > div:nth-child(2) {
            display: none !important;
          }
        `
      }
    };
    
    this.motivationalQuotes = [
      "Focus on your goals, not distractions.",
      "Every moment you resist distraction, you build willpower.",
      "Your future self will thank you for staying focused.",
      "Progress, not perfection.",
      "Stay focused and never give up.",
      "Discipline is choosing between what you want now and what you want most.",
      "Great things never come from comfort zones.",
      "Success is the sum of small efforts repeated daily."
    ];
    
    this.init();
  }
  
  async init() {
    await this.loadSettings();
    await this.syncWithBackgroundSettings(); // Ensure we have latest settings
    this.createUI();
    this.setupBlockingLogic();
    this.injectPlatformBlocking();
    this.setupStorageListener(); // Keep settings in sync
  }
  
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['websiteBlockerSettings']);
      if (result.websiteBlockerSettings) {
        this.settings = { ...this.settings, ...result.websiteBlockerSettings };
        // Ensure granularBlocks exists
        if (!this.settings.granularBlocks) {
          this.settings.granularBlocks = {
            youtubeHomepage: false,
            youtubeRecommendations: false,
            instagramReels: false,
            tiktokFeed: false,
            facebookFeed: false,
            twitterTimeline: false,
            redditFeed: false
          };
        }
      }
      console.log('Loaded settings:', this.settings);
    } catch (error) {
      console.error('Error loading Website Blocker settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set({ websiteBlockerSettings: this.settings });
      console.log('Saved settings:', this.settings);
      
      // Notify background script and content scripts
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'WEBSITE_BLOCKER_UPDATE',
          settings: this.settings
        }).catch(() => {});
      }
      
      // Update all tabs with new blocking rules
      this.updateTabBlocking();
      
    } catch (error) {
      console.error('Error saving Website Blocker settings:', error);
    }
  }
  
  async updateTabBlocking() {
    if (!chrome.tabs) return;
    
    try {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && (this.shouldBlockUrl(tab.url) || this.shouldInjectPlatformCSS(tab.url))) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'CHECK_BLOCK_STATUS',
            settings: this.settings
          }).catch(() => {});
          
          // Inject platform-specific CSS only if granular blocks are enabled
          if (this.shouldInjectPlatformCSS(tab.url)) {
          this.injectPlatformCSSToTab(tab.id, tab.url);
          }
        }
      });
    } catch (error) {
      console.log('Could not update tab blocking:', error);
    }
  }
  
  shouldBlockUrl(url) {
    if (!this.settings.isEnabled || !url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Remove www. for consistent matching
      const cleanHostname = hostname.replace(/^www\./, '');
      
      return this.settings.blockedWebsites.some(blocked => {
        const cleanBlocked = blocked.toLowerCase().replace(/^www\./, '');
        // Check for exact match or if the blocked domain is contained in the hostname
        return cleanHostname === cleanBlocked || 
               cleanHostname.endsWith('.' + cleanBlocked) ||
               cleanBlocked.endsWith('.' + cleanHostname);
      });
    } catch (error) {
      console.error('Error in shouldBlockUrl:', error);
      return false;
    }
  }
  
  shouldInjectPlatformCSS(url) {
    if (!this.settings.isEnabled || !url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      
      // Check if any granular blocks are enabled for this platform
      if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
        return this.settings.granularBlocks?.youtubeRecommendations === true;
      }
      
      if (hostname === 'x.com' || hostname.endsWith('.x.com') || 
          hostname === 'twitter.com' || hostname.endsWith('.twitter.com')) {
        return this.settings.granularBlocks?.twitterTimeline === true;
      }
      
      if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
        return this.settings.granularBlocks?.instagramReels === true;
      }
      
      // For other platforms that might be added later
      return false;
      
    } catch (error) {
      return false;
    }
  }
  
  async injectPlatformCSSToTab(tabId, url) {
    if (!this.shouldInjectPlatformCSS(url)) return;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      
      // Inject specific CSS based on enabled granular blocks only
      if ((hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) && 
          this.settings.granularBlocks?.youtubeRecommendations === true) {
        
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          css: this.platformBlockingRules['youtube.com'].css
        }).catch(() => {});
        
        console.log(`Injected YouTube CSS (recommendations blocking enabled)`);
      }
      
      if ((hostname === 'x.com' || hostname.endsWith('.x.com') || 
           hostname === 'twitter.com' || hostname.endsWith('.twitter.com')) && 
          this.settings.granularBlocks?.twitterTimeline === true) {
        
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          css: this.platformBlockingRules['x.com'].css
        }).catch(() => {});
        
        console.log(`Injected X/Twitter CSS (timeline blocking enabled)`);
      }
      
      if ((hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) && 
          this.settings.granularBlocks?.instagramReels === true) {
        
        await chrome.scripting.insertCSS({
          target: { tabId: tabId },
          css: this.platformBlockingRules['instagram.com'].css
        }).catch(() => {});
        
        console.log(`Injected Instagram CSS (reels blocking enabled)`);
      }
      
    } catch (error) {
      console.error('Error injecting platform CSS:', error);
    }
  }
  
  async injectPlatformBlocking() {
    // Listen for navigation to inject CSS
    if (chrome.webNavigation) {
      chrome.webNavigation.onCompleted.addListener((details) => {
        if (details.frameId === 0 && this.shouldInjectPlatformCSS(details.url)) {
          // Only delay injection if specific granular blocks are enabled
          setTimeout(() => {
            this.injectPlatformCSSToTab(details.tabId, details.url);
          }, 1000);
        }
      });
    }
  }
  
  setupBlockingLogic() {
    // Listen for tab updates to block websites
    if (chrome.tabs && chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'loading' && tab.url) {
          if (this.shouldBlockUrl(tab.url)) {
            this.blockTab(tabId, tab.url);
          } else if (this.shouldInjectPlatformCSS(tab.url)) {
            // Only inject CSS for element blocking if specific granular blocks are enabled
            setTimeout(() => {
              this.injectPlatformCSSToTab(tabId, tab.url);
            }, 1000);
          }
        }
      });
    }
  }
  
  async blockTab(tabId, url) {
    try {
      this.settings.blockedToday++;
      await this.saveSettings();
      
      const blockPageContent = this.generateBlockPage(url);
      
      // Inject the block page
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (content) => {
          document.documentElement.innerHTML = content;
        },
        args: [blockPageContent]
      }).catch(() => {});
      
    } catch (error) {
      console.error('Error blocking tab:', error);
    }
  }
  
  generateBlockPage(blockedUrl) {
    const quote = this.motivationalQuotes[Math.floor(Math.random() * this.motivationalQuotes.length)];
    const hasImage = this.settings.customBlockImage;
    
    if (hasImage) {
      // With image: quote and button in upper left corner
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Website Blocked</title>
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
          <img src="${this.settings.customBlockImage}" alt="Custom block image" class="background-image">
          <div class="content-overlay">
            <div class="quote">"${quote}"</div>
            <button class="back-btn" onclick="history.back()">Go Back</button>
          </div>
        </body>
        </html>
      `;
    } else {
      // Default: black background with centered content
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Website Blocked</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #000;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              text-align: center;
            }
            .container {
              max-width: 400px;
              padding: 20px;
            }
            .quote {
              font-size: 24px;
              font-style: italic;
              margin-bottom: 30px;
              line-height: 1.5;
              font-weight: 300;
            }
            .back-btn {
              background: #007ACC;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              transition: background 0.3s;
            }
            .back-btn:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="quote">"${quote}"</div>
            <button class="back-btn" onclick="history.back()">Go Back</button>
          </div>
        </body>
        </html>
      `;
    }
  }
  
  createUI() {
    const uiHTML = `
      <div class="website-blocker-header">
        <button id="website-blocker-back-btn" class="icon-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5"></path>
            <path d="M12 19l-7-7 7-7"></path>
          </svg>
        </button>
        <div class="website-blocker-title">
          <h2>Stay Focused</h2>
        </div>
        <div class="main-toggle-container">
          <span class="toggle-label">OFF</span>
          <label class="main-toggle-switch ${this.settings.isEnabled ? 'active' : ''}" for="website-blocker-main-toggle">
            <input type="checkbox" id="website-blocker-main-toggle" ${this.settings.isEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">ON</span>
        </div>
      </div>
      
      <div class="website-blocker-content">
        <!-- Block Popular Sites Section -->
        <div class="settings-section">
          <h3>Block Popular Sites</h3>
          <div class="quick-blocks-grid">
            ${this.createQuickBlockItems()}
          </div>
        </div>
        
        <!-- Granular Blocking Section -->
        <div class="settings-section">
          <h3>Block Specific Features</h3>
          <div class="granular-blocks-list">
            ${this.createGranularBlockItems()}
          </div>
        </div>
        
        <!-- Custom Websites Section -->
        <div class="settings-section">
          <h3>Custom Websites</h3>
          <div class="custom-website-input">
            <input type="url" id="custom-site-input" placeholder="https://example.com or example.com">
            <button id="add-custom-site-btn" class="primary-btn">Add</button>
            <button id="add-current-site-btn" class="secondary-btn" title="Add current website">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
              <span>Add Current Website</span>
            </button>
          </div>
          <div class="custom-sites-list" id="custom-sites-list">
            ${this.createCustomSitesList()}
          </div>
        </div>
        
        <!-- Custom Block Image Section -->
        <div class="settings-section">
          <h3>Custom Block Image</h3>
          <div class="image-upload-container">
            <input type="file" id="block-image-input" accept="image/*" style="display: none;">
            <button id="upload-image-btn" class="secondary-btn">
              Choose Image
            </button>
            <div class="image-preview" id="image-preview">
              ${this.settings.customBlockImage ? `<img src="${this.settings.customBlockImage}" alt="Block image preview">` : '<span>No image selected</span>'}
            </div>
          </div>
          ${this.settings.customBlockImage ? '<button id="remove-image-btn" class="danger-btn">Remove Image</button>' : ''}
        </div>
        
        <!-- Statistics Section -->
        <div class="settings-section">
          <h3>Statistics</h3>
          <div class="stats-inline">
            <span class="stat-item">
              <strong id="blocked-today-count">${this.settings.blockedToday || 0}</strong> sites blocked today
            </span>
            <span class="stat-separator">•</span>
            <span class="stat-item">
              <strong id="total-blocked-count">${this.settings.blockedWebsites.length}</strong> total blocked sites
            </span>
          </div>
        </div>
      </div>
    `;
    
    // Create screen element
    const websiteBlockerScreen = document.createElement('div');
    websiteBlockerScreen.id = 'website-blocker-screen';
    websiteBlockerScreen.className = 'screen hidden';
    websiteBlockerScreen.innerHTML = uiHTML;
    
    // Add to document
    document.body.appendChild(websiteBlockerScreen);
    
    this.setupEventListeners();
  }
  
  createQuickBlockItems() {
    const quickSites = [
      { 
        url: 'youtube.com', 
        name: 'YouTube', 
        logo: 'https://www.youtube.com/favicon.ico',
        fallbackLogos: ['https://s.ytimg.com/yts/img/favicon_32-vflOogEID.png', 'https://www.gstatic.com/youtube/img/branding/favicon/favicon_32x32.png'],
        color: '#FF0000' 
      },
      { 
        url: 'tiktok.com', 
        name: 'TikTok', 
        logo: 'https://www.tiktok.com/favicon.ico',
        fallbackLogos: ['https://lf16-tiktok-common.ttwstatic.com/obj/tiktok-web-common-sg/ies/falcon/_next/static/media/favicon.7b2b4bc6.ico'],
        color: '#000000' 
      },
      { 
        url: 'instagram.com', 
        name: 'Instagram', 
        logo: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png',
        fallbackLogos: ['https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico', 'https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png'],
        color: '#E4405F' 
      },
      { 
        url: 'x.com', 
        name: 'X (Twitter)', 
        logo: 'https://abs.twimg.com/favicons/twitter.3.ico',
        fallbackLogos: ['https://abs.twimg.com/favicons/twitter.2.ico', 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png'],
        color: '#000000' 
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
        ],
        color: '#1877F2' 
      },
      { 
        url: 'reddit.com', 
        name: 'Reddit', 
        logo: 'https://www.reddit.com/favicon.ico',
        fallbackLogos: ['https://www.redditstatic.com/desktop2x/img/favicon/favicon-32x32.png', 'https://styles.redditmedia.com/t5_6/styles/communityIcon_a8uzjit9bwr21.png'],
        color: '#FF4500' 
      },
      { 
        url: 'twitch.tv', 
        name: 'Twitch', 
        logo: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png',
        fallbackLogos: ['https://www.twitch.tv/favicon.ico', 'https://static.twitchcdn.net/assets/favicon-16-52e571ffea063af7a7f4.png'],
        color: '#9146FF' 
      }
    ];
    
    return quickSites.map(site => {
      const isBlocked = this.settings.blockedWebsites.includes(site.url);
      const logoHtml = this.createLogoWithFallbacks(site.logo, site.fallbackLogos, site.name);
      
      return `
        <div class="quick-block-item ${isBlocked ? 'blocked' : ''}" data-url="${site.url}" style="--site-color: ${site.color}">
          <div class="site-logo">${logoHtml}</div>
          <div class="site-name">${site.name}</div>
          <div class="toggle-container">
            <label class="site-toggle-switch ${isBlocked ? 'active' : ''}" for="toggle-${site.url.replace('.', '-')}">
              <input type="checkbox" id="toggle-${site.url.replace('.', '-')}" ${isBlocked ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      `;
    }).join('');
  }
  
  createLogoWithFallbacks(primaryLogo, fallbackLogos, altText) {
    // Create a more robust fallback system for Facebook and other logos
    const allLogos = [primaryLogo, ...fallbackLogos];
    const fallbacksString = allLogos.map(logo => `'${logo}'`).join(', ');
    
    return `
      <img src="${primaryLogo}" alt="${altText}" 
           onerror="this.loadFallback = this.loadFallback || 0; 
                    const fallbacks = [${fallbacksString}]; 
                    this.loadFallback++; 
                    if (this.loadFallback < fallbacks.length) { 
                      this.src = fallbacks[this.loadFallback]; 
                    } else { 
                      this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzE4NzdGMiIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Pz88L3RleHQ+Cjwvc3ZnPg=='; 
                      this.style.backgroundColor = 'var(--site-color, #ccc)'; 
                      this.style.borderRadius = '4px'; 
                    }"
           onload="this.style.backgroundColor = 'transparent';">
    `;
  }
  
  createGranularBlockItems() {
    const granularItems = [
      { key: 'youtubeRecommendations', name: 'YouTube Recommendations', icon: 'https://www.youtube.com/favicon.ico' },
      { key: 'twitterTimeline', name: 'X Timeline', icon: 'https://abs.twimg.com/favicons/twitter.3.ico' },
      { key: 'instagramReels', name: 'Instagram Reels', icon: 'https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png' }
    ];
    
    return granularItems.map(item => {
      const isEnabled = this.settings.granularBlocks[item.key];
      return `
        <div class="granular-block-item" data-key="${item.key}">
          <div class="granular-item-info">
            <img src="${item.icon}" alt="${item.name}" class="granular-icon" onerror="this.style.display='none'">
            <span class="granular-name">${item.name}</span>
          </div>
          <label class="granular-toggle-switch ${isEnabled ? 'active' : ''}" for="granular-${item.key}">
            <input type="checkbox" id="granular-${item.key}" ${isEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
    }).join('');
  }
  
  createCustomSitesList() {
    return this.settings.blockedWebsites
      .filter(site => !this.defaultBlockedSites.includes(site))
      .map(site => `
        <div class="custom-site-item" data-url="${site}">
          <span class="site-url">${site}</span>
          <button class="remove-site-btn" data-url="${site}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `).join('');
  }
  
  setupEventListeners() {
    const screen = document.getElementById('website-blocker-screen');
    if (!screen) return;
    
    // Back button
    screen.querySelector('#website-blocker-back-btn').addEventListener('click', () => {
      this.hideUI();
    });
    
    // Custom site addition
    screen.querySelector('#add-custom-site-btn').addEventListener('click', () => {
      this.addCustomSite();
    });
    
    // Add current site button
    screen.querySelector('#add-current-site-btn').addEventListener('click', () => {
      this.addCurrentSite();
    });
    
    screen.querySelector('#custom-site-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addCustomSite();
      }
    });
    
    // Main toggle - Enhanced for smooth operation and synchronization
    const mainToggle = screen.querySelector('#website-blocker-main-toggle');
    const mainToggleSwitch = screen.querySelector('.main-toggle-switch');
    const toggleLabels = screen.querySelectorAll('.toggle-label');
    
    const handleMainToggle = async (e) => {
      const checked = mainToggle.checked;
      console.log('🔄 Internal main toggle changed:', checked);
      
      // Prevent event bubbling
      if (e) e.stopPropagation();
      
      try {
        // Update settings immediately for smooth UX
        this.settings.isEnabled = checked;
        
        // Update UI immediately
        mainToggleSwitch.classList.toggle('active', checked);
        
        // Update label visibility
        toggleLabels.forEach((label, index) => {
          if (index === 0) { // OFF label
            label.classList.toggle('active', !checked);
          } else { // ON label
            label.classList.toggle('active', checked);
          }
        });
        
        // Save settings
        await this.saveSettings();
        
        // Update external toggle (bottom bar)
        if (window.builtinExtensionsManager) {
          window.builtinExtensionsManager.settings['website-blocker'] = { enabled: checked };
          await window.builtinExtensionsManager.saveSettings();
          window.builtinExtensionsManager.updateBottomBar();
        }
        
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'BUILTIN_EXTENSION_TOGGLE',
          extensionId: 'website-blocker',
          enabled: checked
        }).catch(() => {});
        
        // Show feedback
        if (checked) {
          this.showNotification('Website blocking enabled');
        } else {
          this.showNotification('Website blocking disabled');
        }
        
      } catch (error) {
        console.error('❌ Error in handleMainToggle:', error);
        // Revert on error
        mainToggle.checked = !checked;
        mainToggleSwitch.classList.toggle('active', !checked);
      }
    };
    
    mainToggle.addEventListener('change', handleMainToggle);
    
    // Make the whole toggle switch clickable
    mainToggleSwitch.addEventListener('click', (e) => {
      if (e.target === mainToggleSwitch || e.target === mainToggleSwitch.querySelector('.toggle-slider')) {
        e.preventDefault();
        e.stopPropagation();
        mainToggle.checked = !mainToggle.checked;
        handleMainToggle();
      }
    });

    // Quick block toggles - with better event handling
    screen.querySelectorAll('.quick-block-item').forEach(item => {
      const url = item.dataset.url;
      const checkbox = item.querySelector('input[type="checkbox"]');
      const toggleSwitch = item.querySelector('.site-toggle-switch');
      
      const handleSiteToggle = async () => {
        const checked = checkbox.checked;
        console.log(`🔄 Site toggle ${url}:`, checked);
        
        try {
          if (checked) {
            if (!this.settings.blockedWebsites.includes(url)) {
              this.settings.blockedWebsites.push(url);
            }
          } else {
            this.settings.blockedWebsites = this.settings.blockedWebsites.filter(site => site !== url);
          }
          
          // Update UI immediately
          toggleSwitch.classList.toggle('active', checked);
          item.classList.toggle('blocked', checked);
          
          await this.saveSettings();
          this.updateStatistics();
          
          // Update bottom bar
          if (window.builtinExtensionsManager) {
            window.builtinExtensionsManager.updateBottomBar();
          }
          
          // Show feedback
          this.showNotification(`${url} ${checked ? 'blocked' : 'unblocked'}`);
          
        } catch (error) {
          console.error('❌ Error in handleSiteToggle:', error);
          // Revert on error
          checkbox.checked = !checked;
          toggleSwitch.classList.toggle('active', !checked);
          item.classList.toggle('blocked', !checked);
        }
      };
      
      // Make whole card clickable
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking directly on toggle
        if (!e.target.closest('.site-toggle-switch') && !e.target.closest('input')) {
          checkbox.checked = !checkbox.checked;
          handleSiteToggle();
        }
      });
      
      checkbox.addEventListener('change', handleSiteToggle);
      toggleSwitch.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        if (e.target === toggleSwitch) {
          checkbox.checked = !checkbox.checked;
          handleSiteToggle();
        }
      });
    });
    
    // Granular block toggles - Enhanced to properly tie functionality to button states
    screen.querySelectorAll('.granular-block-item').forEach(item => {
      const key = item.dataset.key;
      const checkbox = item.querySelector('input[type="checkbox"]');
      const toggleSwitch = item.querySelector('.granular-toggle-switch');
      
      const handleGranularToggle = async () => {
        const checked = checkbox.checked;
        console.log(`🔄 Granular toggle ${key}:`, checked);
        
        try {
          this.settings.granularBlocks[key] = checked;
          
          // Update UI immediately
          toggleSwitch.classList.toggle('active', checked);
          
          await this.saveSettings();
          
          // Apply or remove the specific blocking immediately
          await this.applyGranularBlockingForKey(key, checked);
          
          // Show feedback
          const itemName = item.querySelector('.granular-name').textContent;
          this.showNotification(`${itemName} ${checked ? 'enabled' : 'disabled'}`);
          
        } catch (error) {
          console.error('❌ Error in handleGranularToggle:', error);
          // Revert on error
          checkbox.checked = !checked;
          toggleSwitch.classList.toggle('active', !checked);
        }
      };
      
      // Make whole item clickable
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking directly on toggle
        if (!e.target.closest('.granular-toggle-switch') && !e.target.closest('input')) {
          checkbox.checked = !checkbox.checked;
          handleGranularToggle();
        }
      });
      
      checkbox.addEventListener('change', handleGranularToggle);
      toggleSwitch.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent item click
        if (e.target === toggleSwitch) {
          checkbox.checked = !checkbox.checked;
          handleGranularToggle();
        }
      });
    });
    
    // Image upload
    screen.querySelector('#upload-image-btn').addEventListener('click', () => {
      screen.querySelector('#block-image-input').click();
    });
    
    screen.querySelector('#block-image-input').addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });
    
    // Remove image
    const removeImageBtn = screen.querySelector('#remove-image-btn');
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => {
        this.removeBlockImage();
      });
    }
  }
  
  showNotification(message) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = 'website-blocker-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-primary);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }
  
  addCustomSite() {
    const input = document.querySelector('#custom-site-input');
    const url = input.value.trim();
    
    if (!url) return;
    
    try {
      let domain;
      
      // Handle different input formats
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Full URL provided
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } else if (url.includes('.')) {
        // Domain only (e.g., "example.com")
        domain = url;
      } else {
        // Invalid format
        this.showNotification('Please enter a valid URL or domain');
        return;
      }
      
      // Clean the domain
      domain = domain.toLowerCase().replace(/^www\./, '');
      
      if (!this.settings.blockedWebsites.includes(domain)) {
        this.settings.blockedWebsites.push(domain);
        this.saveSettings();
        this.updateCustomSitesList();
        this.updateStatistics();
        input.value = '';
        this.showNotification(`${domain} added to blocked sites`);
      } else {
        this.showNotification(`${domain} is already blocked`);
      }
    } catch (error) {
      console.error('Error adding custom site:', error);
      this.showNotification('Please enter a valid URL or domain');
    }
  }
  
  async addCurrentSite() {
    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        this.showNotification('No active tab found');
        return;
      }
      
      const currentTab = tabs[0];
      if (!currentTab.url || currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
        this.showNotification('Cannot block this type of page');
        return;
      }
      
      const urlObj = new URL(currentTab.url);
      const domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
      
      if (!this.settings.blockedWebsites.includes(domain)) {
        this.settings.blockedWebsites.push(domain);
        this.saveSettings();
        this.updateCustomSitesList();
        this.updateStatistics();
        this.showNotification(`${domain} added to blocked sites`);
      } else {
        this.showNotification(`${domain} is already blocked`);
      }
    } catch (error) {
      console.error('Error adding current site:', error);
      this.showNotification('Error adding current site');
    }
  }
  
  removeCustomSite(url) {
    this.settings.blockedWebsites = this.settings.blockedWebsites.filter(site => site !== url);
    this.saveSettings();
    this.updateCustomSitesList();
    this.updateStatistics();
    this.showNotification(`${url} removed from blocked sites`);
  }
  
  updateCustomSitesList() {
    const container = document.querySelector('#custom-sites-list');
    if (container) {
      container.innerHTML = this.createCustomSitesList();
      this.setupCustomSiteRemovalListeners();
    }
  }
  
  setupCustomSiteRemovalListeners() {
    document.querySelectorAll('.remove-site-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.closest('[data-url]').dataset.url;
        this.removeCustomSite(url);
      });
    });
  }
  
  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      this.showNotification('Please select an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit (smaller)
      this.showNotification('Image file is too large. Please select an image under 2MB.');
      return;
    }
    
    try {
      const base64 = await this.fileToBase64(file);
      this.settings.customBlockImage = base64;
      this.saveSettings();
      this.updateImagePreview();
      this.showNotification('Custom block image uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      this.showNotification('Failed to upload image. Please try again.');
    }
  }
  
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  updateImagePreview() {
    const preview = document.querySelector('#image-preview');
    if (preview) {
      if (this.settings.customBlockImage) {
        preview.innerHTML = `<img src="${this.settings.customBlockImage}" alt="Block image preview">`;
        
        // Add remove button if not exists
        if (!document.querySelector('#remove-image-btn')) {
          const removeBtn = document.createElement('button');
          removeBtn.id = 'remove-image-btn';
          removeBtn.className = 'danger-btn';
          removeBtn.textContent = 'Remove Image';
          removeBtn.addEventListener('click', () => this.removeBlockImage());
          preview.parentNode.appendChild(removeBtn);
        }
      } else {
        preview.innerHTML = '<span>No image selected</span>';
        const removeBtn = document.querySelector('#remove-image-btn');
        if (removeBtn) removeBtn.remove();
      }
    }
  }
  
  removeBlockImage() {
    this.settings.customBlockImage = null;
    this.saveSettings();
    this.updateImagePreview();
    this.showNotification('Custom block image removed');
  }
  
  updateStatistics() {
    const totalCount = document.querySelector('#total-blocked-count');
    const todayCount = document.querySelector('#blocked-today-count');
    
    if (totalCount) {
      totalCount.textContent = this.settings.blockedWebsites.length;
    }
    if (todayCount) {
      todayCount.textContent = this.settings.blockedToday || 0;
    }
  }
  
  showUI() {
    const screen = document.getElementById('website-blocker-screen');
    if (screen) {
      // Hide other screens
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      screen.classList.remove('hidden');
      currentScreen = 'website-blocker';
      
      // Update UI with current settings
      this.updateCustomSitesList();
      this.setupCustomSiteRemovalListeners();
      this.updateStatistics();
      this.updateImagePreview();
      
      // Refresh toggle states - Enhanced synchronization
      this.refreshToggleStates();
      
      // Sync with external toggle state
      if (window.builtinExtensionsManager) {
        const externalEnabled = window.builtinExtensionsManager.settings['website-blocker']?.enabled || false;
        if (externalEnabled !== this.settings.isEnabled) {
          this.settings.isEnabled = externalEnabled;
          this.refreshToggleStates();
        }
      }
    }
  }
  
  refreshToggleStates() {
    const screen = document.getElementById('website-blocker-screen');
    if (!screen) return;
    
    // Main toggle - Enhanced refresh
    const mainToggle = screen.querySelector('#website-blocker-main-toggle');
    const mainToggleSwitch = screen.querySelector('.main-toggle-switch');
    const toggleLabels = screen.querySelectorAll('.toggle-label');
    
    if (mainToggle && mainToggleSwitch) {
      mainToggle.checked = this.settings.isEnabled;
      mainToggleSwitch.classList.toggle('active', this.settings.isEnabled);
      
      // Update label visibility
      toggleLabels.forEach((label, index) => {
        if (index === 0) { // OFF label
          label.classList.toggle('active', !this.settings.isEnabled);
        } else { // ON label
          label.classList.toggle('active', this.settings.isEnabled);
        }
      });
    }
    
    // Site toggles
    screen.querySelectorAll('.quick-block-item').forEach(item => {
      const url = item.dataset.url;
      const checkbox = item.querySelector('input[type="checkbox"]');
      const toggleSwitch = item.querySelector('.site-toggle-switch');
      const isBlocked = this.settings.blockedWebsites.includes(url);
      
      if (checkbox && toggleSwitch) {
        checkbox.checked = isBlocked;
        toggleSwitch.classList.toggle('active', isBlocked);
        item.classList.toggle('blocked', isBlocked);
      }
    });

    // Granular toggles
    screen.querySelectorAll('.granular-block-item').forEach(item => {
      const key = item.dataset.key;
      const checkbox = item.querySelector('input[type="checkbox"]');
      const toggleSwitch = item.querySelector('.granular-toggle-switch');
      const isEnabled = this.settings.granularBlocks[key];
      
      if (checkbox && toggleSwitch) {
        checkbox.checked = isEnabled;
        toggleSwitch.classList.toggle('active', isEnabled);
      }
    });
  }
  
  hideUI() {
    const screen = document.getElementById('website-blocker-screen');
    if (screen) {
      screen.classList.add('hidden');
      showScreen('main');
    }
  }

  // New method to apply/remove granular blocking for specific features
  async applyGranularBlockingForKey(key, enabled) {
    if (!this.settings.isEnabled) {
      console.log('🚫 Main blocker disabled, skipping granular blocking');
      return;
    }

    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          continue;
        }
        
        const hostname = new URL(tab.url).hostname.toLowerCase();
        
        // Apply specific granular blocking based on key
        switch (key) {
          case 'youtubeRecommendations':
            if (hostname.includes('youtube.com') || hostname.includes('www.youtube.com')) {
              if (enabled) {
              await this.injectYouTubeBlocking(tab.id, enabled);
              } else {
                await this.removePlatformCSSFromTab(tab.id, tab.url, 'youtube');
              }
            }
            break;
            
          case 'twitterTimeline':
            if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
              if (enabled) {
              await this.injectTwitterBlocking(tab.id, enabled);
              } else {
                await this.removePlatformCSSFromTab(tab.id, tab.url, 'twitter');
              }
            }
            break;
            
          case 'instagramReels':
            if (hostname.includes('instagram.com')) {
              if (enabled) {
              await this.injectInstagramBlocking(tab.id, enabled);
              } else {
                await this.removePlatformCSSFromTab(tab.id, tab.url, 'instagram');
              }
            }
            break;
        }
      }
    } catch (error) {
      console.error('❌ Error applying granular blocking:', error);
    }
  }

  // Enhanced YouTube blocking - more specific targeting
  async injectYouTubeBlocking(tabId, enabled) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (enabled) => {
          if (enabled) {
            // Enhanced YouTube recommendations blocking - only homepage and recommendations
            const css = `
              /* Hide YouTube HOMEPAGE feed only */
              ytd-browse[page-subtype="home"] #contents ytd-rich-grid-renderer,
              ytd-browse[page-subtype="home"] #contents ytd-rich-section-renderer,
              ytd-browse[page-subtype="home"] #primary,
              ytd-browse[page-subtype="home"] .ytd-rich-grid-renderer,
              
              /* Hide recommended videos in sidebar during video watch */
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
              .ytp-ce-channel,
              
              /* Hide trending tab content (but not the tab itself) */
              ytd-browse[page-subtype="trending"] #contents {
                display: none !important;
              }
              
              /* DO NOT hide: */
              /* - Channel videos (ytd-browse[page-subtype="channel"]) */
              /* - Search results (ytd-search) */
              /* - Subscription feed */
            `;
            
            let styleElement = document.getElementById('youtube-blocker-css');
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = 'youtube-blocker-css';
              document.head.appendChild(styleElement);
            }
            styleElement.textContent = css;
          } else {
            // Remove YouTube blocking
            const styleElement = document.getElementById('youtube-blocker-css');
            if (styleElement) {
              styleElement.remove();
            }
          }
        },
        args: [enabled]
      });
    } catch (error) {
      console.error('❌ Error injecting YouTube blocking:', error);
    }
  }

  async injectTwitterBlocking(tabId, enabled) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (enabled) => {
          if (enabled) {
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
            
            let styleElement = document.getElementById('twitter-blocker-css');
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = 'twitter-blocker-css';
              document.head.appendChild(styleElement);
            }
            styleElement.textContent = css;
          } else {
            const styleElement = document.getElementById('twitter-blocker-css');
            if (styleElement) {
              styleElement.remove();
            }
          }
        },
        args: [enabled]
      });
    } catch (error) {
      console.error('❌ Error injecting Twitter blocking:', error);
    }
  }

  async injectInstagramBlocking(tabId, enabled) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (enabled) => {
          if (enabled) {
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
              a[aria-label*="Reels"],
              
              /* Hide explore page distracting content */
              main[role="main"] article,
              section[role="main"] > div > div > div:nth-child(2) {
                display: none !important;
              }
            `;
            
            let styleElement = document.getElementById('instagram-blocker-css');
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = 'instagram-blocker-css';
              document.head.appendChild(styleElement);
            }
            styleElement.textContent = css;
          } else {
            const styleElement = document.getElementById('instagram-blocker-css');
            if (styleElement) {
              styleElement.remove();
            }
          }
        },
        args: [enabled]
      });
    } catch (error) {
      console.error('❌ Error injecting Instagram blocking:', error);
    }
  }

  async removePlatformCSSFromTab(tabId, url, platform) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (platform) => {
          const cssIds = {
            'youtube': 'youtube-blocker-css',
            'twitter': 'twitter-blocker-css', 
            'instagram': 'instagram-blocker-css'
          };
          
          const styleElement = document.getElementById(cssIds[platform]);
          if (styleElement) {
            styleElement.remove();
            console.log(`Removed ${platform} blocking CSS`);
          }
        },
        args: [platform]
      }).catch(() => {});
      
      console.log(`Removed CSS for ${platform} from tab ${tabId}`);
    } catch (error) {
      console.error('Error removing platform CSS:', error);
    }
  }

  async syncWithBackgroundSettings() {
    try {
      // Sync settings from storage to ensure we have the latest state
      await this.loadSettings();
      
      // Also sync with background script if possible
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'GET_WEBSITE_BLOCKER_SETTINGS'
        }).then(response => {
          if (response?.success && response.settings) {
            this.settings = { ...this.settings, ...response.settings };
            console.log('🔄 Synced settings with background script:', this.settings);
          }
        }).catch(() => {
          // Background script might not be available, use local settings
        });
      }
    } catch (error) {
      console.error('Error syncing with background settings:', error);
    }
  }

  setupStorageListener() {
    // Listen for storage changes to keep settings in sync
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.websiteBlockerSettings) {
        const newSettings = changes.websiteBlockerSettings.newValue;
        if (newSettings) {
          console.log('🔄 Settings changed, updating brain-rot-block.js settings:', newSettings);
          this.settings = { ...this.settings, ...newSettings };
          
          // Refresh UI if it's currently shown
          if (!document.getElementById('website-blocker-screen')?.classList.contains('hidden')) {
            this.refreshToggleStates();
          }
          
          // Update tab blocking based on new settings
          this.updateTabBlocking();
        }
      }
    });
  }
}

// Initialize Website Blocker Manager
let websiteBlockerManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    websiteBlockerManager = new WebsiteBlockerManager();
    window.websiteBlockerManager = websiteBlockerManager;
    
    // Keep backwards compatibility
    window.brainRotBlockManager = websiteBlockerManager;
  });
} else {
  websiteBlockerManager = new WebsiteBlockerManager();
  window.websiteBlockerManager = websiteBlockerManager;
  
  // Keep backwards compatibility
  window.brainRotBlockManager = websiteBlockerManager;
} 