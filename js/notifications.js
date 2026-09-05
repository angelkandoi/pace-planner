/**
 * Pace Planner - Notification Service
 * Handles UI Toasts, Web Audio API sound synthesizers (no external assets needed),
 * and desktop browser Notification API integration.
 */

const NotificationService = (() => {
  let audioCtx = null;
  let toastContainer = null;

  /**
   * Lazily initializes AudioContext on user interaction
   */
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Plays a synthesized chime using Web Audio API
   */
  function playSound(type = 'complete') {
    const settings = StorageService.getSettings();
    if (!settings.soundEnabled) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const volume = settings.soundVolume !== undefined ? settings.soundVolume : 0.7;

      if (type === 'complete') {
        // Joyful two-tone chime (F5 -> A5 -> C6)
        playChimeTone(ctx, 698.46, 0.0, 0.25, volume);
        playChimeTone(ctx, 880.00, 0.15, 0.35, volume);
        playChimeTone(ctx, 1046.50, 0.3, 0.5, volume * 1.1);
      } else if (type === 'start') {
        // Uplifting subtle start blip
        playChimeTone(ctx, 523.25, 0.0, 0.15, volume * 0.7);
        playChimeTone(ctx, 659.25, 0.1, 0.25, volume * 0.8);
      } else if (type === 'task-check') {
        // Crisp pop/click
        playClickTone(ctx, 800, volume * 0.5);
      } else if (type === 'warning') {
        // Gentle double pulse
        playChimeTone(ctx, 440, 0.0, 0.15, volume * 0.8);
        playChimeTone(ctx, 349.23, 0.15, 0.25, volume * 0.8);
      }
    } catch (e) {
      console.warn('[NotificationService] Audio playback skipped:', e);
    }
  }

  function playChimeTone(ctx, frequency, delay, duration, masterVol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    // Envelope
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(masterVol * 0.3, ctx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  function playClickTone(ctx, frequency, masterVol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(masterVol * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Initializes or returns toast DOM container
   */
  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        toastContainer.setAttribute('aria-live', 'polite');
        toastContainer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  /**
   * Displays a visual Toast message on screen
   */
  function showToast(message, type = 'info', durationMs = 3500) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const icon = icons[type] || 'ℹ';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">${Utils.escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
      <div class="toast-progress" style="animation-duration: ${durationMs}ms;"></div>
    `;

    container.appendChild(toast);

    // Reflow for CSS animation
    void toast.offsetWidth;
    toast.classList.remove('toast-enter');

    let timer = setTimeout(dismiss, durationMs);

    function dismiss() {
      clearTimeout(timer);
      toast.classList.add('toast-exit');
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', dismiss);
    }

    // Pause dismissal on mouse hover
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      timer = setTimeout(dismiss, 1500);
    });
  }

  /**
   * Requests desktop browser notification permission
   */
  async function requestBrowserPermission() {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser.', 'warning');
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Shows a desktop browser notification if allowed
   */
  function showBrowserNotification(title, options = {}) {
    const settings = StorageService.getSettings();
    if (!settings.browserNotifications) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: 'assets/favicon.svg',
          badge: 'assets/favicon.svg',
          ...options
        });
      } catch (err) {
        console.warn('[NotificationService] Desktop notification error:', err);
      }
    }
  }

  return {
    playSound,
    showToast,
    requestBrowserPermission,
    showBrowserNotification
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.NotificationService = NotificationService;
}
