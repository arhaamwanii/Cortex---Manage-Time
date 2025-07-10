// Pomodoro Timer Content Script - Display Layer Only
let timerElement = null;
let reEnableDot = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentPosition = null; // Set to null initially
const currentDomain = window.location.hostname;

// Check if we're on a new tab page
function isNewTabPage() {
  return window.location.href.startsWith('chrome-extension://') && window.location.pathname.includes('newtab.html');
}

// Initialize timer
function init() {
  console.log('CONTENT: Initializing timer on', window.location.href);
  
  if (isNewTabPage()) {
    console.log('CONTENT: On new tab page - will create timer independently');
    // On new tab, we'll handle timer creation specially
    createReEnableDot();  // Create re-enable dot but don't show it on new tab
    if (reEnableDot) reEnableDot.style.display = 'none'; // Always hide on new tab
    // Don't call createTimerElement here - new tab will handle it
    return; // Don't request timer state - new tab will handle it independently
  }
  
  createTimerElement(); // Create it first
  createReEnableDot();  // Create re-enable dot
  loadPosition();       // Then load and apply the correct position
  requestTimerState();  // Request current state from background
}

// Load saved position for this domain
function loadPosition() {
  // Check if we're on a new tab page - don't apply positioning
  if (isNewTabPage()) {
    console.log('CONTENT: On new tab page, skipping position loading (will be centered via CSS)');
    return;
  }
  
  chrome.storage.sync.get([`position_${currentDomain}`], function(result) {
    if (result[`position_${currentDomain}`]) {
      currentPosition = result[`position_${currentDomain}`];
    } else {
      // Set default position to the middle of the right side of the screen
      currentPosition = { x: 20, y: window.innerHeight / 2 };
    }
    
    // Apply the position
    if (timerElement) {
        // Adjust for element height to truly center it
        const rect = timerElement.getBoundingClientRect();
        timerElement.style.top = (currentPosition.y - (rect.height / 2)) + 'px';
        timerElement.style.right = currentPosition.x + 'px';
    }
  });
}

// Save position for this domain
function savePosition() {
  // Don't save position for new tab page
  if (isNewTabPage()) {
    console.log('CONTENT: On new tab page, skipping position saving');
    return;
  }
  
  chrome.storage.sync.set({
    [`position_${currentDomain}`]: currentPosition
  });
}

// Request timer state from background
function requestTimerState() {
  console.log('CONTENT: Requesting timer state from background...');
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    if (chrome.runtime.lastError) {
      console.error('CONTENT: Failed to get timer state:', chrome.runtime.lastError);
      // Retry after a delay
      setTimeout(() => {
        console.log('CONTENT: Retrying timer state request...');
        requestTimerState();
      }, 2000);
      return;
    }
    
    if (response) {
      console.log('CONTENT: Received timer state:', response, 'Timer element exists:', !!timerElement);
      
      // Create timer element if it doesn't exist and we're enabled
      if (response.enabled && !timerElement) {
        console.log('CONTENT: Creating timer element (was missing, timer enabled)');
        createTimerElement();
        loadPosition();
      }
      
      if (timerElement) {
        updateDisplay(response.timeLeft, response.mode);
        updateStartButton(response.isRunning);
        updateTaskDisplay(response.currentTask, response.isRunning, response.mode);
        updateStopwatchDisplay(response.stopwatch);
        updateFrequencyControls(response.reminderFrequency, response.currentTask, response.customReminderSound, response.reminderEnabled, response.reminderVolume);
      }
      
      // Show/REMOVE timer based on enabled state - COMPLETE REMOVAL, not hiding
      console.log('CONTENT: Timer enabled state:', response.enabled);
      if (response.enabled) {
        console.log('Content script showing timer');
        if (timerElement) timerElement.style.display = 'block';
        if (reEnableDot) reEnableDot.style.display = 'none';
      } else {
        console.log('Content script REMOVING timer completely from DOM');
        if (timerElement) {
          timerElement.remove();
          timerElement = null;
        }
        // No need to show re-enable dot here since this is initial state check
        if (reEnableDot) reEnableDot.style.display = 'none';
      }
    } else {
      console.log('No response or no timer element in content script');
    }
  });
}

// Create the floating timer element
function createTimerElement() {
  if (timerElement) return;
  
  timerElement = document.createElement('div');
  timerElement.id = 'pomodoro-timer';
  timerElement.className = 'pomodoro-timer';
  
  // Create timer display
  const display = document.createElement('div');
  display.className = 'timer-display';
  display.textContent = '25:00'; // Will be updated by background script
  
  // Create controls (hidden by default)
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
  switchModeBtn.onclick = () => {
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
  
  // Create frequency controls
  const freqControls = document.createElement('div');
  freqControls.className = 'freq-controls';
  freqControls.innerHTML = `
    <span class="freq-label">Reminder:</span>
    <button class="arrow-btn" id="freq-down" title="Less Frequent">&minus;</button>
    <span id="freq-value">2 min</span>
    <button class="arrow-btn" id="freq-up" title="More Frequent">&plus;</button>
    <div class="sound-controls">
      <button class="sound-btn" id="sound-upload" title="Upload Custom Sound">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      </button>
      <div class="sound-status">
        <span class="file-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </span>
        <button class="remove-sound-btn" title="Remove Custom Sound">&times;</button>
      </div>
    </div>
  `;
  timerElement.appendChild(freqControls);
  
  // Add reminder indicator dot
  const reminderIndicator = document.createElement('div');
  reminderIndicator.className = 'reminder-indicator';
  reminderIndicator.title = 'Reminders are active';
  timerElement.appendChild(reminderIndicator);
  
  // Add close button - TIMER CONTROLS POPUP
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Minimize Timer';
  closeBtn.onclick = () => {
    console.log('CONTENT: Close button clicked - hiding timer (not disabling)');
    chrome.runtime.sendMessage({ action: 'toggleVisible', visible: false, source: 'closeButton' });
    // TIMER IS AUTHORITY: Report immediately that we're being hidden
    setTimeout(() => {
      reportActualTimerState();
    }, 50);
  };
  timerElement.appendChild(closeBtn);
  
  // Make draggable
  setupDragging();
  
  // Add event listeners for frequency controls
  timerElement.querySelector('#freq-down').addEventListener('click', () => adjustFrequency(-1));
  timerElement.querySelector('#freq-up').addEventListener('click', () => adjustFrequency(1));
  timerElement.querySelector('#sound-upload').addEventListener('click', () => openSoundUpload());
  timerElement.querySelector('.remove-sound-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'removeCustomSound' });
  });
  
  // Show controls on hover
  timerElement.onmouseenter = () => {
    if (!isDragging) {
      controls.style.display = 'flex';
    }
  };
  
  timerElement.onmouseleave = () => {
    if (!isDragging) {
      controls.style.display = 'none';
    }
  };
  
  document.body.appendChild(timerElement);
}

// Create the dot to re-enable the timer
function createReEnableDot() {
  if (reEnableDot) return;
  reEnableDot = document.createElement('div');
  reEnableDot.className = 're-enable-dot';
  reEnableDot.title = 'Show Timer';
  reEnableDot.style.display = 'none'; // Hidden by default
  
  reEnableDot.onclick = () => {
    console.log('CONTENT: Re-enable dot clicked - showing timer');
    chrome.runtime.sendMessage({ action: 'toggleVisible', visible: true, source: 'reEnableDot' }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('CONTENT: Error showing timer:', chrome.runtime.lastError);
        // Retry after delay
        setTimeout(() => {
          console.log('CONTENT: Retrying show after error...');
          chrome.runtime.sendMessage({ action: 'toggleVisible', visible: true, source: 'reEnableDot' });
        }, 1000);
        return;
      }
      console.log('CONTENT: Re-enable response:', response);
      // TIMER IS AUTHORITY: Report immediately that we're being shown
      setTimeout(() => {
        reportActualTimerState();
      }, 50);
    });
  };

  document.body.appendChild(reEnableDot);
  setupDotDragging(reEnableDot);
}

// Setup dragging functionality
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
  
  const newX = window.innerWidth - (e.clientX - dragOffset.x + timerElement.offsetWidth);
  const newY = e.clientY - dragOffset.y;
  
  // Keep within viewport bounds
  const maxX = window.innerWidth - timerElement.offsetWidth;
  const maxY = window.innerHeight - timerElement.offsetHeight;
  
  currentPosition.x = Math.max(0, Math.min(maxX, window.innerWidth - (e.clientX - dragOffset.x + timerElement.offsetWidth)));
  currentPosition.y = Math.max(0, Math.min(maxY, newY));
  
  timerElement.style.right = currentPosition.x + 'px';
  timerElement.style.top = currentPosition.y + 'px';
}

function stopDrag() {
  if (!isDragging) return;
  
  isDragging = false;
  timerElement.style.cursor = 'grab';
  
  // Save position
  savePosition();
}

function setupDotDragging(dot) {
    let isDotDragging = false;
    let dotDragOffset = { y: 0 };

    dot.addEventListener('mousedown', (e) => {
        isDotDragging = true;
        dot.style.cursor = 'grabbing';
        dotDragOffset.y = e.clientY - dot.getBoundingClientRect().top;
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDotDragging) return;
        let newY = e.clientY - dotDragOffset.y;
        const maxY = window.innerHeight - dot.offsetHeight;
        newY = Math.max(0, Math.min(newY, maxY));
        dot.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!isDotDragging) return;
        isDotDragging = false;
        dot.style.cursor = 'pointer';
    });
}

// Format time as MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Toggle timer start/stop
function toggleTimer() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    if (response.isRunning) {
      chrome.runtime.sendMessage({action: 'stopTimer'});
    } else {
      chrome.runtime.sendMessage({action: 'startTimer'});
    }
  });
}

// Reset timer
function resetTimer() {
  chrome.runtime.sendMessage({action: 'resetTimer'});
}

// Update timer display
function updateDisplay(timeLeft, mode) {
  if (!timerElement) return;
  const display = timerElement.querySelector('.timer-display');
  const switchModeBtn = timerElement.querySelector('#switchModeBtn');

  display.textContent = formatTime(timeLeft);

  if (mode === 'stopwatch') {
      timerElement.classList.add('stopwatch-mode');
      if(switchModeBtn) {
          switchModeBtn.textContent = 'To Timer';
          switchModeBtn.title = 'Switch to Timer';
      }
  } else {
      timerElement.classList.remove('stopwatch-mode');
      if(switchModeBtn) {
          switchModeBtn.textContent = 'To Stopwatch';
          switchModeBtn.title = 'Switch to Stopwatch';
      }
  }
}

// Update start button text
function updateStartButton(isRunning) {
  if (!timerElement) return;
  const startBtn = timerElement.querySelector('.start-btn');
  startBtn.textContent = isRunning ? 'Pause' : 'Start';
}

// Update stopwatch display
function updateStopwatchDisplay(stopwatch) {
    if (!timerElement) return;
    const stopwatchDisplay = timerElement.querySelector('.stopwatch-display');
    if (stopwatch && stopwatch.isRunning) {
        stopwatchDisplay.textContent = '⏱️ ' + formatTime(stopwatch.time);
        stopwatchDisplay.style.display = 'block';
    } else {
        stopwatchDisplay.style.display = 'none';
    }
}

// Update frequency controls
function updateFrequencyControls(frequency, task, customSound, reminderEnabled, reminderVolume) {
  if (!timerElement) return;
  const freqControls = timerElement.querySelector('.freq-controls');
  const freqValue = timerElement.querySelector('#freq-value');
  const reminderIndicator = timerElement.querySelector('.reminder-indicator');
  const uploadBtn = timerElement.querySelector('#sound-upload');
  const soundStatus = timerElement.querySelector('.sound-status');

  if (task) {
    freqValue.textContent = frequency === 0 ? 'Off' : `${frequency} min`;
    if (frequency > 0 && reminderEnabled) {
        reminderIndicator.style.display = 'block';
        if (customSound) {
            uploadBtn.style.display = 'none';
            soundStatus.style.display = 'flex';
        } else {
            uploadBtn.style.display = 'inline-block';
            soundStatus.style.display = 'none';
        }
    } else {
        reminderIndicator.style.display = 'none';
        uploadBtn.style.display = 'none';
        soundStatus.style.display = 'none';
    }
  } else {
    freqControls.style.display = 'none';
    reminderIndicator.style.display = 'none';
    uploadBtn.style.display = 'none';
    soundStatus.style.display = 'none';
  }
}

// Update task display
function updateTaskDisplay(task, isRunning, mode) {
  if (!timerElement) return;
  const taskDisplay = timerElement.querySelector('.task-display');
  const taskBtn = timerElement.querySelector('#taskBtn');
  const settingsBtn = timerElement.querySelector('[title="Set Duration"]');

  if (task) {
    taskDisplay.textContent = task;
    taskDisplay.style.display = 'block';
  } else {
    taskDisplay.style.display = 'none';
  }
  
  if(settingsBtn) {
    settingsBtn.style.display = mode === 'pomodoro' ? 'inline-block' : 'none';
  }

  if (taskBtn) {
    taskBtn.disabled = isRunning;
    if(isRunning) {
        taskBtn.style.opacity = '0.5';
        taskBtn.style.cursor = 'not-allowed';
    } else {
        taskBtn.style.opacity = '1';
        taskBtn.style.cursor = 'pointer';
    }
  }
}

// Show settings prompt
function showSettings() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    const currentMinutes = Math.floor(response.timeLeft / 60);
    const minutes = prompt('Set timer duration (minutes):', currentMinutes);
    if (minutes && !isNaN(minutes) && minutes > 0) {
      chrome.runtime.sendMessage({
        action: 'updateDuration',
        duration: parseInt(minutes)
      });
    }
  });
}

function showTaskPrompt() {
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
      if (response && !response.isRunning) {
          const task = prompt('What are you working on?', response.currentTask || '');
          if (task !== null) { 
              chrome.runtime.sendMessage({action: 'setTask', task: task});
          }
      } else {
          alert('You cannot change the task while the timer is running.');
      }
  });
}

function adjustFrequency(change) {
    chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
        if (response) {
            let newFreq = response.reminderFrequency + change;
            if (newFreq < 0) newFreq = 0; // Minimum 0 minutes
            if (newFreq > 60) newFreq = 60; // Maximum 60 minutes
            chrome.runtime.sendMessage({ action: 'updateReminderFrequency', frequency: newFreq });
        }
    });
}

function openSoundUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const soundDataUrl = event.target.result;
            chrome.runtime.sendMessage({ action: 'setCustomSound', sound: soundDataUrl });
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// =====================================
// STANDALONE AUDIO REMINDER SYSTEM
// =====================================

function playStandaloneAudioReminder(request) {
  console.log('CONTENT: 🔊 Playing standalone audio reminder with settings:', {
    enabled: request.enabled,
    volume: request.volume,
    hasCustomSound: !!request.customSound,
    isBackupTab: request.isBackupTab
  });
  
  if (!request.enabled) {
    console.log('CONTENT: 🔊 Standalone audio reminder disabled - not playing');
    return;
  }
  
  const volume = Math.max(0, Math.min(1, request.volume || 0.5));
  console.log('CONTENT: 🔊 Playing standalone audio reminder with volume:', volume);
  
  if (request.customSound) {
    console.log('CONTENT: 🔊 Playing custom audio for standalone reminder');
    playStandaloneCustomAudio(request.customSound, volume);
  } else {
    console.log('CONTENT: 🔊 Playing default beep for standalone reminder');
    playStandardBeep(volume);
  }
}

function playStandaloneCustomAudio(audioDataUrl, volume) {
  console.log('CONTENT: 🔊 Creating standalone custom audio with volume:', volume);
  try {
    const audio = new Audio(audioDataUrl);
    audio.volume = volume;
    
    audio.addEventListener('error', (e) => {
      console.error('CONTENT: 🔊 Standalone custom audio error:', e.error);
      console.log('CONTENT: 🔊 Falling back to standard beep');
      playStandardBeep(volume);
    });
    
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('CONTENT: 🔊 Standalone custom audio started playing');
      }).catch((error) => {
        console.error('CONTENT: 🔊 Standalone custom audio play failed:', error);
        playStandardBeep(volume);
      });
    }
  } catch (error) {
    console.error('CONTENT: 🔊 Error creating standalone custom audio:', error);
    playStandardBeep(volume);
  }
}

function playStandardBeep(volume) {
  console.log('CONTENT: 🔊 Playing standard beep with volume:', volume);
  
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.log('CONTENT: 🔊 AudioContext not supported, using fallback');
      playStandardBeepFallback(volume);
      return;
    }
    
    const audioCtx = new AudioContext();
    
    // Handle suspended audio context
    if (audioCtx.state === 'suspended') {
      console.log('CONTENT: 🔊 AudioContext suspended, resuming...');
      audioCtx.resume().then(() => {
        createStandardOscillator(audioCtx, volume);
      }).catch((error) => {
        console.error('CONTENT: 🔊 Failed to resume AudioContext:', error);
        playStandardBeepFallback(volume);
      });
    } else {
      createStandardOscillator(audioCtx, volume);
    }
  } catch (error) {
    console.error('CONTENT: 🔊 Error creating AudioContext:', error);
    playStandardBeepFallback(volume);
  }
}

function createStandardOscillator(audioCtx, volume) {
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Standard beep characteristics - single clean tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Higher frequency for better audibility
    gainNode.gain.setValueAtTime(volume * 0.7, audioCtx.currentTime); // Prevent distortion
    
    // Single short beep
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15); // Short 150ms beep
    
    oscillator.addEventListener('ended', () => {
      console.log('CONTENT: 🔊 Standard beep completed');
      audioCtx.close().catch(() => {}); // Ignore close errors
    });
    
    console.log('CONTENT: 🔊 Standard beep started playing');
  } catch (error) {
    console.error('CONTENT: 🔊 Error creating standard oscillator:', error);
    playStandardBeepFallback(volume);
  }
}

function playStandardBeepFallback(volume) {
  console.log('CONTENT: 🔊 Using standard beep fallback');
  
  try {
    // Create a simple WAV beep
    const duration = 0.15; // 150ms
    const frequency = 800; // 800Hz
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.volume = volume;
    
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('CONTENT: 🔊 Standard beep fallback started playing');
      }).catch(() => {
        console.log('CONTENT: 🔊 Standard beep fallback failed - no audio available');
      });
    }
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audio.src);
    });
    
  } catch (error) {
    console.error('CONTENT: 🔊 Standard beep fallback failed:', error);
  }
}

// =====================================
// END STANDALONE AUDIO REMINDER SYSTEM
// =====================================

function playReminderSound(reminderData = null) {
  console.log('CONTENT: 🔊 playReminderSound called with data:', reminderData);
  
  // If reminder data is provided (from message), use it directly to avoid race conditions
  if (reminderData) {
    console.log('CONTENT: Using provided reminder data:', {
      reminderEnabled: reminderData.reminderEnabled,
      reminderVolume: reminderData.reminderVolume,
      hasCustomSound: !!reminderData.customReminderSound
    });
    
    if (!reminderData.reminderEnabled) {
      console.log('CONTENT: ❌ Reminder disabled - not playing sound');
      return;
    }
    
    const volume = Math.max(0, Math.min(1, reminderData.reminderVolume || 0.5));
    console.log('CONTENT: ✅ FORCE PLAYING AUDIO - Volume:', volume);
    
    if (reminderData.customReminderSound) {
      console.log('CONTENT: 🎵 Playing custom audio file');
      playCustomAudio(reminderData.customReminderSound, volume);
    } else {
      console.log('CONTENT: 🎵 Playing generated tone');
      playGeneratedTone(volume);
    }
  } else {
    // Fallback: get state from background (old behavior)
    console.log('CONTENT: No reminder data provided, fetching from background...');
    
    // Handle "Extension context invalidated" error gracefully
    try {
      chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
        if (chrome.runtime.lastError) {
          console.error('CONTENT: ❌ Failed to get timer state:', chrome.runtime.lastError);
          
          // If extension context is invalidated, play default audio anyway
          if (chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('context invalidated')) {
            console.log('CONTENT: 🚨 Extension context invalidated - playing default audio');
            playGeneratedTone(0.5); // Default volume
          }
          return;
        }
        
        if (!response) {
          console.log('CONTENT: ❌ No response from background - playing default audio');
          playGeneratedTone(0.5); // Default volume
          return;
        }
        
        if (!response.reminderEnabled) {
          console.log('CONTENT: ❌ Reminder disabled in response');
          return;
        }
        
        const volume = Math.max(0, Math.min(1, response.reminderVolume || 0.5));
        console.log('CONTENT: Playing sound with volume from background:', volume);
        
        if (response.customReminderSound) {
          console.log('CONTENT: 🎵 Playing custom audio file from background');
          playCustomAudio(response.customReminderSound, volume);
        } else {
          console.log('CONTENT: 🎵 Playing generated tone from background');
          playGeneratedTone(volume);
        }
      });
    } catch (sendMessageError) {
      console.error('CONTENT: 🚨 chrome.runtime.sendMessage failed:', sendMessageError);
      console.log('CONTENT: 🚨 Playing default audio as emergency fallback');
      playGeneratedTone(0.5); // Emergency fallback
    }
  }
}

function playCustomAudio(audioDataUrl, volume) {
  console.log('CONTENT: 🎵 Creating custom audio element with volume:', volume);
  try {
    const audio = new Audio(audioDataUrl);
    audio.volume = volume;
    
    audio.addEventListener('canplaythrough', () => {
      console.log('CONTENT: ✅ Custom audio loaded successfully');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('CONTENT: ❌ Custom audio error:', e.error);
      console.log('CONTENT: 🔄 Falling back to generated tone');
      playGeneratedTone(volume);
    });
    
    audio.addEventListener('ended', () => {
      console.log('CONTENT: ✅ Custom audio playback completed');
    });
    
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('CONTENT: ✅ Custom audio started playing');
      }).catch((error) => {
        console.error('CONTENT: ❌ Custom audio play failed:', error);
        console.log('CONTENT: 🔄 Falling back to generated tone');
        playGeneratedTone(volume);
      });
    }
  } catch (error) {
    console.error('CONTENT: ❌ Error creating custom audio:', error);
    console.log('CONTENT: 🔄 Falling back to generated tone');
    playGeneratedTone(volume);
  }
}

function playGeneratedTone(volume) {
  console.log('CONTENT: 🎵 Creating generated tone with volume:', volume);
  
  // Try AudioContext first
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.error('CONTENT: ❌ AudioContext not supported, trying fallback');
      playFallbackBeep(volume);
      return;
    }
    
    const audioCtx = new AudioContext();
    
    // Handle suspended audio context (common in Chrome)
    if (audioCtx.state === 'suspended') {
      console.log('CONTENT: 🔄 AudioContext suspended, trying to resume...');
      audioCtx.resume().then(() => {
        console.log('CONTENT: ✅ AudioContext resumed');
        createOscillatorBeep(audioCtx, volume);
      }).catch((error) => {
        console.error('CONTENT: ❌ Failed to resume AudioContext:', error);
        playFallbackBeep(volume);
      });
    } else {
      createOscillatorBeep(audioCtx, volume);
    }
  } catch (error) {
    console.error('CONTENT: ❌ Error creating AudioContext:', error);
    playFallbackBeep(volume);
  }
}

function createOscillatorBeep(audioCtx, volume) {
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Sound characteristics
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); // Increased frequency for better audibility
    gainNode.gain.setValueAtTime(volume * 0.8, audioCtx.currentTime); // Slightly reduce to prevent distortion

    // Play and stop the sound
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2); // Slightly longer for better audibility
    
    oscillator.addEventListener('ended', () => {
      console.log('CONTENT: ✅ Generated tone playback completed');
      audioCtx.close().catch(() => {}); // Ignore close errors
    });
    
    oscillator.addEventListener('error', (error) => {
      console.error('CONTENT: ❌ Oscillator error:', error);
      playFallbackBeep(volume);
    });
    
    console.log('CONTENT: ✅ Generated tone started playing');
  } catch (error) {
    console.error('CONTENT: ❌ Error creating oscillator:', error);
    playFallbackBeep(volume);
  }
}

function playFallbackBeep(volume) {
  console.log('CONTENT: 🔄 Using fallback beep method with volume:', volume);
  
  // Method 1: Try creating a data URL audio element
  try {
    // Generate a simple beep tone using data URL
    const duration = 0.2;
    const frequency = 400;
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * volume * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.volume = volume;
    
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('CONTENT: ✅ Fallback beep started playing');
      }).catch((error) => {
        console.error('CONTENT: ❌ Fallback beep failed:', error);
        playUltimateFallback();
      });
    }
    
    audio.addEventListener('ended', () => {
      console.log('CONTENT: ✅ Fallback beep completed');
      URL.revokeObjectURL(audio.src);
    });
    
  } catch (error) {
    console.error('CONTENT: ❌ Fallback beep method failed:', error);
    playUltimateFallback();
  }
}

function playUltimateFallback() {
  console.log('CONTENT: 🚨 Using ultimate fallback - visual flash');
  
  // Create a brief visual flash as the last resort
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(76, 175, 80, 0.3);
    z-index: 999999;
    pointer-events: none;
    animation: reminderFlash 0.3s ease-out;
  `;
  
  // Add keyframes if not already present
  if (!document.querySelector('#reminder-flash-styles')) {
    const styles = document.createElement('style');
    styles.id = 'reminder-flash-styles';
    styles.textContent = `
      @keyframes reminderFlash {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(flash);
  
  setTimeout(() => {
    if (flash.parentNode) {
      flash.parentNode.removeChild(flash);
    }
    console.log('CONTENT: ✅ Visual flash reminder completed');
  }, 300);
}

// TIMER IS AUTHORITY: Report actual state to background for popup sync
function reportActualTimerState() {
  // Skip reporting on new tab pages - they are independent
  if (isNewTabPage()) {
    console.log('CONTENT: On new tab page - skipping state reporting');
    return;
  }
  
  // CRITICAL FIX: Always return boolean, never null
  // Timer is visible if element exists AND is not hidden
  const actuallyVisible = !!(timerElement && timerElement.style.display !== 'none' && timerElement.parentNode);
  
  console.log('CONTENT: Reporting timer state - visible:', actuallyVisible, 'element exists:', !!timerElement, 'display style:', timerElement ? timerElement.style.display : 'N/A', 'in DOM:', timerElement ? !!timerElement.parentNode : false);
  
  chrome.runtime.sendMessage({
    action: 'reportTimerState',
    actuallyVisible: actuallyVisible,
    timestamp: Date.now()
  }).catch(() => {
    console.log('CONTENT: Could not report state to background');
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'updateTimerDisplay':
      updateDisplay(request.timeLeft, request.mode);
      updateStartButton(request.isRunning);
      updateTaskDisplay(request.currentTask, request.isRunning, request.mode);
      updateStopwatchDisplay(request.stopwatch);
      updateFrequencyControls(request.reminderFrequency, request.currentTask, request.customReminderSound, request.reminderEnabled, request.reminderVolume);
      
      // Skip visibility control on new tab pages - they handle their own state
      if (isNewTabPage()) {
        console.log('CONTENT: On new tab page - ignoring visibility state changes');
        return;
      }
      
      // Handle timer visibility based on both enabled and timerVisible states
      console.log('CONTENT: received updateTimerDisplay, enabled:', request.enabled, 'timerVisible:', request.timerVisible);
      
      if (!request.enabled) {
        // Timer is completely disabled - remove everything
        console.log('CONTENT: Timer is disabled - removing everything');
        if (timerElement) {
          timerElement.remove();
          timerElement = null;
        }
        if (reEnableDot) reEnableDot.style.display = 'none';
      } else if (request.enabled && request.timerVisible) {
        // Timer is enabled and should be visible
        console.log('CONTENT: Timer is enabled and visible - showing timer');
        if (!timerElement) {
          console.log('CONTENT: Creating timer element (was removed)');
          createTimerElement();
          loadPosition();
        }
        if (timerElement) timerElement.style.display = 'block';
        if (reEnableDot) reEnableDot.style.display = 'none';
      } else if (request.enabled && !request.timerVisible) {
        // Timer is enabled but hidden (X button was clicked)
        console.log('CONTENT: Timer is enabled but hidden - showing re-enable dot');
        if (timerElement) {
          timerElement.remove();
          timerElement = null;
        }
        // Show re-enable dot
        if (!reEnableDot) {
          console.log('CONTENT: Creating re-enable dot (was missing)');
          createReEnableDot();
        }
        if (reEnableDot) reEnableDot.style.display = 'block';
      }
      
      // TIMER CONTROLS POPUP: Report our actual state after change
      setTimeout(reportActualTimerState, 100);
      break;
      
    case 'forceStateSync':
      // Skip force sync on new tab pages - they handle their own state
      if (isNewTabPage()) {
        console.log('CONTENT: On new tab page - ignoring force sync');
        return;
      }
      
      // FORCE SYNC: Background is forcing us to sync
      console.log('CONTENT: Force sync received, enabled:', request.enabled, 'timerVisible:', request.timerVisible);
      
      if (!request.enabled) {
        // Timer is completely disabled - remove everything
        console.log('CONTENT: Force sync - timer is disabled, removing everything');
        if (timerElement) {
          timerElement.remove();
          timerElement = null;
        }
        if (reEnableDot) reEnableDot.style.display = 'none';
      } else if (request.enabled && request.timerVisible) {
        // Timer is enabled and should be visible
        console.log('CONTENT: Force sync - timer is enabled and visible');
        if (!timerElement) {
          console.log('CONTENT: Force sync - creating timer element (was removed)');
          createTimerElement();
          loadPosition();
        }
        updateDisplay(request.timeLeft, request.mode);
        updateStartButton(request.isRunning);
        updateTaskDisplay(request.currentTask, request.isRunning, request.mode);
        updateStopwatchDisplay(request.stopwatch);
        updateFrequencyControls(request.reminderFrequency, request.currentTask, request.customReminderSound, request.reminderEnabled, request.reminderVolume);
        
        if (timerElement) timerElement.style.display = 'block';
        if (reEnableDot) reEnableDot.style.display = 'none';
      } else if (request.enabled && !request.timerVisible) {
        // Timer is enabled but hidden (X button was clicked)
        console.log('CONTENT: Force sync - timer is enabled but hidden');
        if (timerElement) {
          timerElement.remove();
          timerElement = null;
        }
        // Show re-enable dot
        if (!reEnableDot) {
          console.log('CONTENT: Creating re-enable dot (was missing)');
          createReEnableDot();
        }
        if (reEnableDot) reEnableDot.style.display = 'block';
      }
      
      // Report back our state after force sync
      setTimeout(reportActualTimerState, 200);
      break;
      
    case 'remindTask':
      console.log('CONTENT: 🔔 Received remindTask message:', {
        timestamp: request.timestamp,
        currentTask: request.currentTask,
        reminderVolume: request.reminderVolume,
        reminderEnabled: request.reminderEnabled,
        hasCustomSound: !!request.customReminderSound,
        hasTimerElement: !!timerElement,
        forcePlay: request.forcePlay,
        retryAfterInjection: request.retryAfterInjection,
        url: window.location.href.substring(0, 50)
      });
      
      // ALWAYS play audio if forcePlay is true, regardless of timer visibility
      if (request.forcePlay || request.reminderEnabled) {
        console.log('CONTENT: 🎵 Force playing reminder sound (forcePlay:', request.forcePlay, ', enabled:', request.reminderEnabled, ')');
        
        // Pass reminder data directly to avoid race condition
        playReminderSound({
          reminderEnabled: request.reminderEnabled,
          reminderVolume: request.reminderVolume,
          customReminderSound: request.customReminderSound
        });
        
        // Show notification if no timer element visible
        if (!timerElement && request.currentTask) {
          console.log('CONTENT: 📢 No timer element - showing notification for task:', request.currentTask);
          if (Notification.permission === 'granted') {
            new Notification('Task Reminder', {
              body: `Don't forget: ${request.currentTask}`,
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>',
              silent: false // Allow sound
            });
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Task Reminder', {
                  body: `Don't forget: ${request.currentTask}`,
                  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>',
                  silent: false
                });
              }
            });
          }
        }
      }
      
      // Visual effects only if timer is visible
      if (timerElement) {
        const taskDisplay = timerElement.querySelector('.task-display');
        console.log('CONTENT: Task display element found:', !!taskDisplay, 'has text:', taskDisplay?.textContent);
        
        if (taskDisplay && taskDisplay.textContent) {
          console.log('CONTENT: ✅ Showing visual glow effect');
          
          taskDisplay.classList.add('task-glow');
          setTimeout(() => {
            taskDisplay.classList.remove('task-glow');
            console.log('CONTENT: ✅ Task glow effect completed');
          }, 2000); // Glow for 2 seconds
        } else {
          console.log('CONTENT: ❌ No task display or task text - skipping visual effects');
        }
      } else {
        console.log('CONTENT: ❌ No timer element - audio played but no visual effects');
      }
      
      // Send acknowledgment back to background
      if (sendResponse) {
        sendResponse({ 
          success: true, 
          hasTimerElement: !!timerElement,
          playedAudio: !!(request.forcePlay || request.reminderEnabled),
          url: window.location.href
        });
      }
      break;
      
    case 'playStandaloneAudioReminder':
      console.log('CONTENT: 🔊 Received standalone audio reminder:', request);
      playStandaloneAudioReminder(request);
      if (sendResponse) {
        sendResponse({ success: true, timestamp: request.timestamp });
      }
      break;

    case 'timerComplete':
      // Play a sound
      playSound();
      // Timer completed notification - only request permission when needed
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('CORTEX Timer', {
              body: 'Time is up! Take a break.',
              icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>'
            });
          }
        });
      } else if (Notification.permission === 'granted') {
        new Notification('CORTEX Timer', {
          body: 'Time is up! Take a break.',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%234CAF50"/></svg>'
        });
      }
      break;
  }
});

// Function to play a sound without audio files
function playSound() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Sound characteristics
  oscillator.type = 'sine'; // 'sine', 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

  // Play and stop the sound
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.5); // Play for 0.5 seconds
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// TIMER IS AUTHORITY: Report state periodically to ensure popup sync
console.log('CONTENT: Starting timer state reporting every 2 seconds');
setInterval(() => {
  // Skip periodic reporting on new tab pages
  if (isNewTabPage()) {
    return;
  }
  
  reportActualTimerState();
}, 2000);

// PAGE VISIBILITY API: Handle tab becoming active again after Chrome suspension
console.log('CONTENT: Setting up page visibility listeners for tab activation detection');

// Listen for visibility changes (primary method)
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && !isNewTabPage()) {
    console.log('CONTENT: Tab became visible - refreshing timer state');
    requestTimerState();
    
    // Also request again after a short delay to handle any timing issues
    setTimeout(() => {
      requestTimerState();
    }, 500);
  }
});

// Listen for window focus (backup method)
window.addEventListener('focus', function() {
  if (!isNewTabPage()) {
    console.log('CONTENT: Window gained focus - refreshing timer state');
    requestTimerState();
  }
});

// Listen for pageshow event (handles back/forward cache)
window.addEventListener('pageshow', function(event) {
  if (!isNewTabPage()) {
    console.log('CONTENT: Page shown (persisted:', event.persisted, ') - refreshing timer state');
    requestTimerState();
  }
});

// Also refresh state when page loads/reloads
window.addEventListener('load', function() {
  if (!isNewTabPage()) {
    console.log('CONTENT: Page loaded - refreshing timer state');
    requestTimerState();
  }
});

// Only request notification permission when timer completes, not on every page load

// Expose functions to global scope for new tab access
window.createTimerElement = createTimerElement;
window.updateDisplay = updateDisplay;
window.updateStartButton = updateStartButton;
window.updateTaskDisplay = updateTaskDisplay;
window.updateStopwatchDisplay = updateStopwatchDisplay;
window.updateFrequencyControls = updateFrequencyControls;