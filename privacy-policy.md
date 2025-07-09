# Privacy Policy for CORTEX - Smart Pomodoro Timer

**Last Updated: January 2024**

## 1. Introduction

Thank you for choosing CORTEX - Smart Pomodoro Timer ("the Extension," "we," "us"). Your privacy is critically important to us. This Privacy Policy is designed to give you a clear understanding of what data the Extension collects, why it's collected, and how it is handled.

This policy affirms our commitment to transparency and responsible data practices in compliance with the Google Chrome Web Store Developer Program Policies.

## 2. Our Core Privacy Principles

*   **Zero Server-Side Collection:** We do **not** have a server. All your data is stored locally on your machine or synced to your personal Google account. We, the developers, never see, collect, or have access to your personal data.
*   **Minimalism:** The Extension is designed to collect only the absolute minimum data required for its core features to function.
*   **User Control:** You are in full control of your data.

## 3. What Data Is Collected and Why

The Extension uses Chrome's storage APIs (`chrome.storage.sync` and `chrome.storage.local`) to save settings and state. Here is a detailed breakdown of every piece of data collected and its specific purpose:

| Data Category             | Specific Data Points Collected                                                                              | Purpose of Collection                                                                                                   | Storage API Used         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Timer & Stopwatch State** | `timeLeft`, `isRunning`, `defaultTime`, `mode` (pomodoro/stopwatch), `stopwatch.time`, `stopwatch.isRunning` | To save the current state of your timer so that it persists when you close your browser and can be synchronized across devices. This is a core user-facing feature. | `chrome.storage.sync`    |
| **Task Management**         | `currentTask`, `reminderFrequency`                                                                          | To store the name of the task you are currently focused on and the frequency of reminders. This is a core user-facing feature. | `chrome.storage.sync`    |
| **Extension Settings**      | `timerEnabled`                                                                                              | To remember whether you have the timer enabled or minimized, so the UI state is preserved between sessions.          | `chrome.storage.sync`    |
| **UI Preferences**          | `position_{currentDomain}` (e.g., `position_youtube.com`)                                                 | To save the floating timer's X/Y coordinates on your screen for each specific website, remembering your preferred placement. | `chrome.storage.sync`    |
| **Custom Reminder Sound**   | A Base64 encoded string of the audio file you upload.                                                       | To store your custom sound file for alarms and reminders directly in your browser's storage, so it can be played without needing to be re-uploaded. | `chrome.storage.local`   |

## 4. How Your Data Is Stored and Secured

All data is stored and managed by the Google Chrome browser's secure storage APIs:

*   **`chrome.storage.sync`**: This stores most of your settings. The data is stored locally and automatically synced to any Chrome browser where you are logged into your Google account. This data is protected by your Google account's security.
*   **`chrome.storage.local`**: This is used specifically for the custom sound file, as it may be too large for `sync` storage. This data is stored only on your local computer and is not synced across devices.

Security is handled by the browser's built-in mechanisms. We do not implement any additional security measures because we never transmit or handle your data on any external servers.

## 5. Data Sharing and Third Parties

We **do not** share, sell, rent, or transfer any user data to any third parties for any reason. The data you generate is yours and yours alone.

## 6. Compliance with Google Policies

We strictly adhere to the policies set forth by the Google Chrome Web Store.

**The use and transfer of information received from Google APIs by CORTEX - Smart Pomodoro Timer will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.**

## 7. Managing and Deleting Your Data

You have full control over your data. You can clear all data stored by this extension at any time by:

1.  Right-clicking the extension icon in your browser toolbar.
2.  Going to your browser's extension management page (`chrome://extensions`), finding the extension, and selecting "Remove" to delete the extension and all its associated data permanently.

## 8. Children's Privacy

This extension is not intended for use by children under the age of 13. We do not knowingly collect any personal information from children under 13. If you believe that a child has provided us with personal information, please contact us, and we will take steps to delete such information.

## 9. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by posting the new Privacy Policy on this page and updating the **"Last Updated"** date at the top.

## 10. Contact Us

If you have any questions, concerns, or feedback about this Privacy Policy, please contact us at:

**[Your Professional Email Address or a Link to Your GitHub/Contact Page]** 