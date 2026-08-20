export const NOTIFICATION_STORAGE_KEY = 'meta-ecom-notifications-v1'

const DEFAULT_NOTIFICATIONS = [
  { id: 'welcome-notice', icon: 'sparkles', title: 'Campaign workspace đã sẵn sàng', detail: 'Bạn có thể theo dõi Timeline và Client Review tại đây.', unread: false, createdAt: '2026-08-20T08:00:00.000Z' },
]

export function readStoredNotifications() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOTIFICATION_STORAGE_KEY))
    return Array.isArray(parsed) ? parsed : DEFAULT_NOTIFICATIONS
  } catch {
    return DEFAULT_NOTIFICATIONS
  }
}

export function writeStoredNotifications(notifications) {
  window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
}

export function appendStoredNotification(notification) {
  const current = readStoredNotifications()
  const next = [{ unread: true, createdAt: new Date().toISOString(), ...notification }, ...current.filter((item) => item.id !== notification.id)].slice(0, 40)
  writeStoredNotifications(next)
  return next
}
