const STORAGE_KEY = 'fluffy-color-lab:seen-marker-match-notice'

export function hasSeenMatchNotice(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markMatchNoticeSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage unavailable — the notice just reappears next time, harmless
  }
}
