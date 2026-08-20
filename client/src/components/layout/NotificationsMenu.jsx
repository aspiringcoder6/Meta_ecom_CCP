import { useNavigate } from 'react-router-dom'
import { useApp } from '../../hooks/useApp'
import Icon from '../common/Icon'

export default function NotificationsMenu({ open, onToggle }) {
  const navigate = useNavigate()
  const { notifications, markAllNotificationsRead, markNotificationRead } = useApp()
  const unreadCount = notifications.filter((notification) => notification.unread).length
  const openNotification = (notification) => {
    markNotificationRead(notification.id)
    if (notification.href) navigate(notification.href)
    else if (notification.campaignId) navigate(`/campaigns/${notification.campaignId}`)
    if (open) onToggle()
  }
  return (
    <div className="dropdown-wrap">
      <button className={`icon-button notification-button ${open ? 'is-active' : ''}`} onClick={onToggle} aria-label="Thông báo">
        <Icon name="bell" />{unreadCount > 0 && <span className="notification-dot">{Math.min(unreadCount, 99)}</span>}
      </button>
      {open && (
        <div className="popover notification-popover">
          <div className="popover-heading"><strong>Thông báo</strong>{unreadCount > 0 && <button type="button" onClick={markAllNotificationsRead}>Đánh dấu tất cả đã đọc</button>}</div>
          <div className="notification-scroll">
            {notifications.slice(0, 12).map((notification) => <button type="button" className={`notification-item ${notification.unread ? 'unread' : ''}`} onClick={() => openNotification(notification)} key={notification.id}><span className="notice-symbol"><Icon name={notification.icon || 'bell'} size={17} /></span><div><strong>{notification.title}</strong><small>{notification.detail}</small></div></button>)}
            {!notifications.length && <p className="notification-empty">Chưa có thông báo mới.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
