export function playAlertSound(): void {
  try {
    const audio = new Audio('/sounds/ozy-notification.mp3')
    audio.volume = 0.7
    audio.play().catch(() => {})
  } catch {
    // Fallback silencioso si el browser bloquea audio
  }
}
