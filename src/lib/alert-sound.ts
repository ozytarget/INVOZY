let audioUnlocked = false;
let cachedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!cachedAudio) {
    cachedAudio = new Audio('/sounds/ozy-notification.mp3');
    cachedAudio.volume = 0.7;
  }
  return cachedAudio;
}

/** Call once on first user click to unlock audio playback from timers */
export function unlockAudio(): void {
  if (audioUnlocked) return;
  try {
    const audio = getAudio();
    // Play + immediately pause to unlock the audio element
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audioUnlocked = true;
    }).catch(() => { });
  } catch {
    // silent
  }
}

export function playAlertSound(): void {
  try {
    const audio = getAudio();
    audio.currentTime = 0;
    audio.play().catch(() => { });
  } catch {
    // Fallback silencioso si el browser bloquea audio
  }
}
