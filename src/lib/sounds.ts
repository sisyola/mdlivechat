// Notification sound utilities with user preferences

export interface SoundPreferences {
  chatSound: string;
  messageSound: string;
  volume: number;
  enabled: boolean;
}

const DEFAULT_PREFS: SoundPreferences = {
  chatSound: "chime",
  messageSound: "double",
  volume: 70,
  enabled: true,
};

export function getSoundPreferences(): SoundPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;

  try {
    const stored = localStorage.getItem("sound_preferences");
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_PREFS;
}

const SOUND_PATTERNS: Record<string, number[]> = {
  chime: [523, 659, 784, 1047],
  ding: [440, 0, 330],
  pop: [800, 400],
  bell: [880, 1100, 880],
  ascending: [440, 554, 659, 784],
  double: [880, 0, 880],
};

const SOUND_DURATIONS: Record<string, number> = {
  chime: 0.6,
  ding: 0.5,
  pop: 0.2,
  bell: 0.4,
  ascending: 0.5,
  double: 0.3,
};

function playSound(patternId: string, volume: number) {
  if (typeof window === "undefined") return;

  const prefs = getSoundPreferences();
  if (!prefs.enabled) {
    console.log("[Sound] Notifications disabled");
    return;
  }

  try {
    const win = window as unknown as { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const frequencies = SOUND_PATTERNS[patternId] || SOUND_PATTERNS.double;
    const duration = SOUND_DURATIONS[patternId] || 0.3;
    const vol = (volume / 100) * 0.5;

    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    const step = duration / frequencies.length;
    frequencies.forEach((freq, i) => {
      if (freq > 0) {
        osc.frequency.setValueAtTime(freq, ctx.currentTime + step * i);
      }
    });

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);

    console.log("[Sound] Played:", patternId);
  } catch (e) {
    console.log("[Sound] Error:", e);
  }
}

export function playNewMessageSound() {
  const prefs = getSoundPreferences();
  playSound(prefs.messageSound, prefs.volume);
}

export function playNewChatSound() {
  const prefs = getSoundPreferences();
  playSound(prefs.chatSound, prefs.volume);
}

// Aliases
export function playNotificationSound() {
  playNewMessageSound();
}

export function playIncomingChatSound() {
  playNewChatSound();
}
