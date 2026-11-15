/* Install hints. iPhones never fire an install prompt, so the Me tab explains Share → Add to Home Screen once.
   Android and desktop Chrome hand us a deferred prompt we can show from a button. */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach(l => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach(l => l())
  })
}

export const isStandalone = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)

export const isIOS = (): boolean => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)

export const canPromptInstall = (): boolean => deferred !== null

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const ev = deferred
  deferred = null
  await ev.prompt()
  const { outcome } = await ev.userChoice
  listeners.forEach(l => l())
  return outcome === 'accepted'
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

const TIP_KEY = 'travelbud:homeScreenTipDismissed'
export const homeScreenTipDismissed = (): boolean => {
  try {
    return localStorage.getItem(TIP_KEY) === '1'
  } catch {
    return false
  }
}
export const dismissHomeScreenTip = () => {
  try {
    localStorage.setItem(TIP_KEY, '1')
  } catch {
    /* private mode */
  }
}
