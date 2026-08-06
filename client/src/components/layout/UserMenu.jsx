import Icon from '../common/Icon'

export default function UserMenu({ open, onToggle }) {
  return (
    <div className="dropdown-wrap">
      <button className="user-menu" onClick={onToggle}>
        <span className="avatar avatar-small admin-avatar">HD</span>
        <span className="user-copy"><strong>Hiếu Đặng</strong><small>Quản trị viên</small></span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="popover user-popover">
          <button>Xem hồ sơ</button><button>Cài đặt Workspace</button><span /><button>Đăng xuất</button>
        </div>
      )}
    </div>
  )
}
