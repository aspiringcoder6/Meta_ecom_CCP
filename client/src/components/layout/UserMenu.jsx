import { useNavigate } from 'react-router-dom'
import { ROLE_LABELS } from '../../config/navigation'
import { useAuth } from '../../hooks/useAuth'
import Icon from '../common/Icon'

function initials(name) {
  return String(name || 'User').split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()
}

export default function UserMenu({ open, onToggle }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const signOut = async () => {
    onToggle()
    await logout()
    navigate('/login', { replace: true })
  }
  return (
    <div className="dropdown-wrap">
      <button className="user-menu" onClick={onToggle}>
        {user.avatarUrl ? <img className="avatar avatar-small admin-avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatar avatar-small admin-avatar">{initials(user.name)}</span>}
        <span className="user-copy"><strong>{user.name}</strong><small>{ROLE_LABELS[user.role]}</small></span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="popover user-popover">
          <div className="user-popover-account"><strong>{user.name}</strong><small>{user.email}</small></div>
          <span />
          {user.role === 'ADMIN' && <button onClick={() => navigate('/settings')}>Cài đặt Workspace</button>}
          <button onClick={signOut}>Đăng xuất</button>
        </div>
      )}
    </div>
  )
}
