---
layout: default
title: Privacy Policy Elevate
---


# Privacy Policy for Elevate

**Last Updated: July 10, 2025**

---

## 1. Introduction

Thank you for choosing Elevate ("the Extension," "we," "us," or "our"). Your privacy is of paramount importance to us. This Privacy Policy provides a comprehensive and transparent explanation of what data Elevate collects, why it's collected, how it's processed and stored, and your rights regarding your personal information.

This policy has been designed to comply with international privacy regulations including GDPR, CCPA, and the Google Chrome Web Store Developer Program Policies. It reflects our commitment to privacy-by-design principles and responsible data stewardship.

Elevate is a productivity-focused Chrome extension that provides a floating Pomodoro timer, intelligent website blocking, and focus enhancement tools that work across all websites you visit.

---

## 2. Our Core Privacy Principles

### 2.1 Zero External Data Collection
- **No Servers**: We operate **zero servers** and maintain no external databases
- **No Third-Party Analytics**: We do not use Google Analytics, Facebook Pixel, or any tracking services
- **No Data Transmission**: Your data never leaves your device except through Google's secure Chrome sync
- **No Profiling**: We do not build user profiles or behavioral tracking systems

### 2.2 Privacy by Design
- **Minimal Data Collection**: We collect only data essential for core functionality
- **Local Processing**: All data processing occurs entirely within your browser
- **User Control**: You maintain complete control over all collected data
- **Transparency**: This policy documents every piece of data we access or store

### 2.3 Security and Encryption
- **Chrome Security**: All storage utilizes Chrome's built-in encryption and security measures
- **No Plaintext Transmission**: Any data sync occurs through Google's encrypted infrastructure
- **Local Encryption**: Sensitive data like custom audio files use browser-native security

---

## 3. Detailed Data Collection and Usage

### 3.1 Timer and Session Data

**Data Collected:**
- `timeLeft`: Current countdown time remaining (in seconds)
- `isRunning`: Boolean indicating if timer is actively running
- `defaultTime`: Your preferred session duration (in seconds)
- `mode`: Current timer mode ("pomodoro" or "stopwatch")
- `stopwatch.time`: Elapsed time for stopwatch sessions (in seconds)
- `stopwatch.isRunning`: Boolean indicating if stopwatch is active

**Purpose:** To maintain timer continuity across browser sessions, tabs, and devices. This enables you to start a focus session on one device and continue seamlessly on another.

**Storage:** `chrome.storage.sync` (synced across your Chrome installations)

**Retention:** Stored indefinitely until you reset timer or uninstall extension

### 3.2 Task and Productivity Management

**Data Collected:**
- `currentTask`: Text description of your current focus task (up to 100 characters)
- `reminderFrequency`: How often audio reminders play (1-60 minutes)
- `reminderEnabled`: Boolean whether audio reminders are active
- `reminderVolume`: Audio volume level (0.0 to 1.0)

**Purpose:** To help you stay focused on specific objectives and receive customizable productivity reminders during work sessions.

**Storage:** `chrome.storage.sync` (synced across devices)

**Retention:** Stored until you modify or clear the task

### 3.3 User Interface and Experience Preferences

**Data Collected:**
- `timerEnabled`: Boolean whether floating timer is active
- `timerVisible`: Boolean whether timer is minimized or fully displayed
- `newtabEnabled`: Boolean whether extension replaces your new tab page
- `position_{domainname}`: X/Y coordinates of timer placement for each website domain

**Examples of Position Storage:**
- `position_youtube.com`: `{x: 20, y: 300}`
- `position_github.com`: `{x: 1200, y: 150}`
- `position_stackoverflow.com`: `{x: 50, y: 500}`

**Purpose:** To remember your personalized timer placement on each website and maintain your preferred extension configuration across sessions.

**Storage:** `chrome.storage.sync` (synced across devices)

**Retention:** Stored indefinitely until you change positions or reset settings

### 3.4 Website Blocking and Focus Management

**Data Collected:**
- `websiteBlockerSettings.isEnabled`: Boolean whether website blocking is active
- `websiteBlockerSettings.blockedWebsites`: Array of domain names you've chosen to block
- `websiteBlockerSettings.blockedToday`: Integer count of blocking events in current day
- `websiteBlockerSettings.granularBlocks`: Object containing specific feature blocking settings
  - `youtubeRecommendations`: Boolean for blocking YouTube sidebar recommendations
  - `twitterTimeline`: Boolean for blocking Twitter/X timeline
  - `instagramReels`: Boolean for blocking Instagram Reels section
- `websiteBlockerSettings.customBlockImage`: Base64-encoded custom block screen image (optional)

**Example Blocked Websites Array:**
```
["youtube.com", "facebook.com", "instagram.com", "x.com", "tiktok.com", "reddit.com", "pinterest.com"]
```

**Purpose:** To enforce your chosen website restrictions during focus sessions and provide granular control over distracting website features.

**Storage:** `chrome.storage.local` (not synced - local device only)

**Retention:** Stored until you modify blocking settings or uninstall extension

### 3.5 Custom Audio and Personalization

**Data Collected:**
- `customReminderSound`: Base64-encoded audio file data (when you upload custom reminder sounds)
- `audioReminderSystem`: Standalone audio reminder configuration
  - `enabled`: Boolean whether audio reminders are active
  - `frequency`: Reminder interval in minutes (1-60)
  - `volume`: Audio volume level (0.0 to 1.0)
  - `customSound`: Base64-encoded custom audio file

**Audio File Processing:**
When you upload a custom reminder sound, we:
1. Convert the file to Base64 encoding within your browser
2. Store the encoded data locally in Chrome storage
3. Play the audio using browser APIs during reminders
4. Never transmit the audio data to external servers

**Storage:** `chrome.storage.local` for audio files (local only), `chrome.storage.sync` for settings

**Retention:** Custom audio stored until you remove it or uninstall extension

### 3.6 Website URL Processing for Blocking

**Data Accessed:**
- Current tab URLs (when determining blocking status)
- Website domain names (for position storage and blocking decisions)
- Navigation events (to apply blocking before page loads)

**Processing Details:**
- URLs are parsed to extract domain names (e.g., "www.youtube.com" becomes "youtube.com")
- Domains are compared against your blocked websites list
- No complete URLs or browsing history are stored
- Processing occurs entirely within your browser

**Purpose:** To implement website blocking functionality and remember timer positions per domain.

**Data Retention:** Domain names stored for position memory; URLs processed in real-time only

---

## 4. Technical Implementation and Data Storage

### 4.1 Chrome Storage API Usage

**Chrome Sync Storage (`chrome.storage.sync`)**
- **Capacity:** Up to 100KB total, 8KB per item
- **Encryption:** End-to-end encrypted by Google
- **Synchronization:** Automatic across Chrome installations where you're signed in
- **Contents:** Timer settings, preferences, positions, task data

**Chrome Local Storage (`chrome.storage.local`)**
- **Capacity:** Up to 5MB total
- **Encryption:** Device-level encryption through Chrome
- **Synchronization:** Local device only, not synced
- **Contents:** Website blocking settings, custom audio files

### 4.2 Data Processing Locations

All data processing occurs within your local Chrome browser:
- **Timer calculations:** Performed by browser JavaScript
- **Audio playback:** Handled by Web Audio API
- **Website monitoring:** Content scripts running in browser tabs
- **Storage operations:** Chrome's built-in storage systems

**No External Processing:** We maintain no servers, databases, or cloud processing systems.

### 4.3 Cross-Tab Synchronization

The extension synchronizes timer state across browser tabs using:
- Chrome's message passing API (`chrome.runtime.sendMessage`)
- Background service worker coordination
- Real-time state broadcasting between tabs

This synchronization occurs entirely within your browser and does not involve external networks.

---

## 5. Permissions Detailed Explanation

### 5.1 Required Permissions and Their Usage

**`activeTab`**
- **Purpose:** Display floating timer on your current webpage
- **Usage:** Inject timer interface into active browser tab
- **Data Access:** Current tab's URL for positioning and blocking decisions
- **Limitations:** Only accesses the tab you're currently viewing

**`storage`**
- **Purpose:** Save your preferences and timer state
- **Usage:** Store settings in Chrome's secure storage systems
- **Data Access:** Only data we explicitly store (detailed in Section 3)
- **Limitations:** Cannot access other extensions' data or browsing history

**`tabs`**
- **Purpose:** Synchronize timer across browser tabs and implement website blocking
- **Usage:** Send timer updates between tabs, enforce website blocks
- **Data Access:** Tab URLs for blocking decisions, tab IDs for messaging
- **Limitations:** Cannot access tab content or personal data

**`scripting`**
- **Purpose:** Inject timer interface and blocking functionality
- **Usage:** Add timer elements to webpages, apply website blocks
- **Data Access:** Ability to modify webpage appearance only
- **Limitations:** Cannot access personal data or form inputs

**`webNavigation`**
- **Purpose:** Detect navigation for new tab integration and website blocking
- **Usage:** Redirect new tabs to timer workspace, block restricted sites
- **Data Access:** Navigation events and destination URLs
- **Limitations:** Cannot modify navigation beyond blocking/redirecting

**`notifications`**
- **Purpose:** Alert you when timer sessions complete
- **Usage:** Show desktop notifications for completed focus sessions
- **Data Access:** Ability to create notifications with your task names
- **Limitations:** Cannot access system notifications from other applications

### 5.2 Permissions We Do NOT Request

- **History:** We cannot access your browsing history
- **Bookmarks:** We cannot read or modify your bookmarks
- **Downloads:** We cannot access your download history
- **Geolocation:** We cannot determine your location
- **Camera/Microphone:** We cannot access media devices
- **File System:** We cannot read arbitrary files from your computer
- **Network:** We cannot make external network requests

---

## 6. Data Sharing and Third-Party Access

### 6.1 No Third-Party Sharing

We **categorically do not** share, sell, rent, lease, or transfer any user data to third parties including:
- Advertising networks
- Analytics companies
- Data brokers
- Marketing firms
- Other software companies
- Government agencies (except as legally required)

### 6.2 No Advertising or Tracking

Elevate contains:
- **No advertisements** of any kind
- **No tracking pixels** or analytics beacons
- **No social media widgets** that track users
- **No affiliate marketing** systems
- **No user behavior tracking** for commercial purposes

### 6.3 Google Sync Integration

The only external data interaction occurs through Google's Chrome Sync service:
- **Purpose:** Synchronize your settings across your Chrome installations
- **Google's Role:** Secure transportation and storage of encrypted sync data
- **User Control:** You can disable Chrome Sync in browser settings
- **Encryption:** End-to-end encrypted by Google's infrastructure

**Google does not have access to the content of your synced extension data.**

---

## 7. Data Security and Protection

### 7.1 Encryption and Security

**At Rest:**
- All data stored using Chrome's built-in encryption
- Custom audio files stored with browser security protections
- Position and preference data encrypted through Chrome Sync

**In Transit:**
- Chrome Sync data transmitted through Google's encrypted channels
- No other external data transmission occurs
- All processing remains within browser's secure environment

**Access Control:**
- Data accessible only through your Chrome browser profile
- Extension isolation prevents other extensions from accessing our data
- No administrative backdoors or remote access capabilities

### 7.2 Vulnerability Prevention

- **Content Security Policy:** Strict CSP prevents code injection attacks
- **Manifest V3:** Latest Chrome extension security standards
- **Input Validation:** All user inputs sanitized and validated
- **Secure APIs:** Only secure Chrome extension APIs utilized

### 7.3 Data Integrity

- **Backup Prevention:** No automatic backups to external systems
- **Version Control:** Settings changes require explicit user action
- **Corruption Recovery:** Chrome handles storage corruption recovery
- **Validation:** Data format validation on all storage operations

---

## 8. Your Privacy Rights and Data Control

### 8.1 Access and Portability

**View Your Data:**
1. Open Chrome Developer Tools (F12)
2. Navigate to Application → Storage → Extension Storage
3. View all stored extension data in readable format

**Export Your Data:**
Your timer settings are exportable through Chrome's sync data export tools available in Chrome settings.

### 8.2 Modification and Deletion

**Modify Your Data:**
- All settings accessible through extension popup interface
- Real-time changes to preferences and configurations
- Immediate effect of all modifications

**Delete Specific Data:**
- Reset timer: Clear current session data
- Clear positions: Remove timer placement memory for all websites
- Delete custom audio: Remove uploaded reminder sounds
- Clear blocking list: Remove all blocked websites

**Complete Data Deletion:**
1. **Extension Removal:** Uninstall extension to delete all local data
2. **Chrome Sync Clearing:** Disable Chrome Sync and clear sync data
3. **Manual Clearing:** Use Chrome storage clearing tools

### 8.3 Opt-Out Mechanisms

**Website Blocking:** Disable completely in extension settings
**New Tab Override:** Toggle off to restore default Chrome new tab
**Audio Reminders:** Disable all reminder functionality
**Position Memory:** Reset to clear all saved timer positions
**Chrome Sync:** Disable in Chrome settings to prevent data synchronization

---

## 9. Compliance and Legal Framework

### 9.1 GDPR Compliance (European Union)

**Lawful Basis for Processing:** Legitimate interest in providing productivity tools
**Data Minimization:** Only process data essential for functionality
**Consent:** Clear opt-in for all major features
**Right to Erasure:** Complete data deletion on extension removal
**Data Portability:** Settings exportable through Chrome tools
**Privacy by Design:** Built with minimal data collection from inception

### 9.2 CCPA Compliance (California)

**Consumer Rights Honored:**
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of data processing
- Right to non-discrimination for exercising privacy rights

**No Sale of Personal Information:** We do not sell any user data.

### 9.3 Chrome Web Store Policies

**Limited Use Requirements:** 
All data usage strictly limited to providing core extension functionality.

**User Data Policy Compliance:**
- Transparent disclosure of all data collection
- Secure handling of user information
- No unnecessary data collection beyond stated functionality

**Developer Program Policy Adherence:**
Full compliance with Google's Chrome Web Store Developer Program Policies.

---

## 10. Special Considerations

### 10.1 Children's Privacy (COPPA Compliance)

Elevate is not specifically designed for or marketed to children under 13. However, the extension:
- **No Age Verification:** Does not collect age information
- **School Safe:** No inappropriate content or external communications
- **Educational Use:** Can be safely used in educational environments
- **Parental Control:** Parents can monitor usage through Chrome's family settings

If you believe a child under 13 has used this extension, no personal data would have been collected beyond the technical information detailed in this policy.

### 10.2 Workplace and Enterprise Use

**Administrator Visibility:**
In enterprise Chrome environments, IT administrators may have access to:
- Extension installation status
- Chrome Sync data (if enterprise controls are enabled)
- General usage patterns through enterprise management tools

**Data Isolation:**
- Extension data remains separate from enterprise systems
- No automatic reporting to workplace administrators
- Timer data is personal productivity information, not work monitoring

### 10.3 International Data Transfers

**Chrome Sync:** If you use Chrome Sync, your encrypted extension data may be processed in Google's international data centers, subject to Google's privacy policies and data protection measures.

**No Other Transfers:** We perform no independent international data transfers.

---

## 11. Technical Transparency

### 11.1 Open Source Availability

The complete source code for Elevate is available for inspection, allowing:
- **Verification:** Confirm this privacy policy accurately reflects code behavior
- **Security Auditing:** Independent security researchers can review our implementation
- **Transparency:** Technical users can understand exactly how data is processed

### 11.2 Update Mechanism

**Automatic Updates:** Chrome automatically updates the extension
**Change Notification:** Significant privacy changes will trigger policy updates
**Version Control:** Each update includes changelog detailing privacy-relevant changes

### 11.3 Data Flow Diagram

```
User Input → Browser Storage → Chrome Sync (Optional) → Other Devices
     ↓
Website Content → URL Processing → Blocking Decision
     ↓
Timer Interface → Position Storage → Per-Domain Memory
```

**No External Servers or Databases in Data Flow**

---

## 12. Incident Response and Data Breaches

### 12.1 Breach Prevention

**No External Attack Surface:** Zero servers or databases means no external breach risk
**Browser Security:** Rely on Chrome's battle-tested security architecture
**Isolation:** Extension isolation prevents cross-extension data access

### 12.2 Hypothetical Incident Response

In the unlikely event of a security incident:
1. **Immediate Assessment:** Evaluate scope of any potential data exposure
2. **User Notification:** Inform users within 72 hours of discovery
3. **Remediation:** Release updated extension addressing any vulnerabilities
4. **Transparency:** Public disclosure of incident details and resolution

### 12.3 Vulnerability Reporting

Report security vulnerabilities to: [Contact Information to be added]

We commit to:
- Acknowledging reports within 48 hours
- Providing regular updates on investigation progress
- Crediting responsible disclosure where appropriate

---

## 13. Future Changes and Updates

### 13.1 Policy Updates

We may update this Privacy Policy to:
- Reflect new extension features
- Address regulatory changes
- Improve clarity and transparency
- Respond to user feedback

### 13.2 Notification of Changes

**Significant Changes:** Email notification (if contact provided) or prominent in-extension notice
**Minor Changes:** Updated "Last Updated" date and version history
**User Choice:** Continued use constitutes acceptance of updated terms

### 13.3 Version History

This privacy policy represents a comprehensive documentation of all data practices as of July 10, 2025.

---

## 14. Contact Information and Support

### 14.1 Privacy Questions

For questions about this Privacy Policy or your data:
- **Primary Contact:** [Developer contact information to be added]
- **Response Time:** We aim to respond within 7 business days
- **Languages:** Support available in English

### 14.2 Data Subject Requests

To exercise your privacy rights:
1. **Email:** Send detailed request to privacy contact
2. **In-Extension:** Use settings panel for most data modifications
3. **Chrome Tools:** Use Chrome's built-in data management tools

### 14.3 Regulatory Inquiries

For regulatory or legal inquiries regarding data processing:
- **GDPR:** [EU representative contact to be added if required]
- **CCPA:** [California agent contact to be added if required]
- **General:** [Primary legal contact to be added]

---

## 15. Conclusion

Elevate is designed with privacy as a fundamental principle. We collect only the minimal data necessary to provide you with a powerful productivity tool, process that data entirely within your browser, and give you complete control over your information.

Your focus and productivity are our priority, and protecting your privacy is essential to that mission. This detailed policy represents our commitment to transparency and responsible data stewardship.

**By using Elevate, you acknowledge that you have read, understood, and agree to the data practices described in this Privacy Policy.**

---

**Document Version:** 2.0  
**Effective Date:** July 10, 2025  
**Last Reviewed:** July 10, 2025  
**Next Scheduled Review:** January 10, 2026

---

*This privacy policy is written in compliance with GDPR Article 12 (Transparent information), CCPA Section 1798.100 (Consumer Right to Know), and Chrome Web Store Developer Program Policies. It is designed to be easily understood while providing comprehensive technical detail for those who require it.* 