import Icon from '../common/Icon'

export default function NotificationsMenu({ open, onToggle }) {
  return (
    <div className="dropdown-wrap">
      <button className={`icon-button notification-button ${open ? 'is-active' : ''}`} onClick={onToggle} aria-label="Thông báo">
        <Icon name="bell" /><span className="notification-dot">3</span>
      </button>
      {open && (
        <div className="popover notification-popover">
          <div className="popover-heading"><strong>Thông báo</strong><button>Đánh dấu tất cả đã đọc</button></div>
          <div className="notification-item unread"><span className="notice-symbol"><Icon name="clock" size={17} /></span><div><strong>2 Deliverable sắp đến hạn</strong><small>Summer Glow · đến hạn ngày mai</small></div></div>
          <div className="notification-item unread"><span className="notice-symbol"><Icon name="userCheck" size={17} /></span><div><strong>Creator đã được Client duyệt</strong><small>Tuấn Kiệt đã được Lumière duyệt</small></div></div>
          <div className="notification-item"><span className="notice-symbol"><Icon name="message" size={17} /></span><div><strong>Có Client feedback mới</strong><small>Nhận được 3 giờ trước</small></div></div>
          <button className="popover-footer">Xem tất cả thông báo</button>
        </div>
      )}
    </div>
  )
}
