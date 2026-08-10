import { ROLE_LABELS } from '../../config/navigation'
import Icon from '../common/Icon'
import UserStatusBadge from './UserStatusBadge'

const ROLES = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER']

function dateLabel(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value))
}

export default function UserManagementTable({ users, currentUserId, selectedRoles, onSelectRole, onApprove, onReject, onStatus, onDelete, busyId }) {
  if (!users.length) return <div className="empty-user-list"><Icon name="users" size={29} /><strong>Không có tài khoản phù hợp</strong><p>Danh sách sẽ tự cập nhật khi có yêu cầu mới.</p></div>
  return (
    <div className="user-table-wrap">
      <table className="user-table">
        <thead><tr><th>Người dùng</th><th>Nguồn / Bộ phận</th><th>Ngày tạo</th><th>Trạng thái</th><th>Role</th><th>Thao tác</th></tr></thead>
        <tbody>{users.map((user) => {
          const busy = busyId === user.id
          const selectedRole = selectedRoles[user.id] || user.role || 'MEMBER'
          return <tr key={user.id} className={user.status === 'PENDING' ? 'is-pending' : ''}>
            <td><div className="user-identity">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span>{user.name?.slice(0, 1).toUpperCase()}</span>}<div><strong>{user.name}</strong><small>{user.email}{user.id === currentUserId ? ' · Bạn' : ''}</small></div></div></td>
            <td><strong>{user.provider === 'GOOGLE' ? 'Google' : 'Email & password'}</strong><small>{user.department || 'Chưa cung cấp'}</small></td>
            <td><strong>{dateLabel(user.createdAt)}</strong><small>{user.lastLoginAt ? `Đăng nhập: ${dateLabel(user.lastLoginAt)}` : 'Chưa đăng nhập'}</small></td>
            <td><UserStatusBadge status={user.status} /></td>
            <td><select className="role-select" value={selectedRole} disabled={busy || user.id === currentUserId} onChange={(event) => {
              const role = event.target.value
              onSelectRole(user.id, role)
              if (user.status === 'ACTIVE') onStatus(user, { role })
            }}>{ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></td>
            <td><div className="user-actions">
              {user.status === 'PENDING' && <><button className="approve-button" disabled={busy} onClick={() => onApprove(user, selectedRole)}><Icon name="check" size={16} />Duyệt</button><button className="reject-button" disabled={busy} onClick={() => onReject(user)}>Từ chối</button></>}
              {user.status === 'ACTIVE' && <button className="secondary-button compact" disabled={busy || user.id === currentUserId} onClick={() => onStatus(user, { status: 'SUSPENDED' })}>Tạm ngưng</button>}
              {(user.status === 'SUSPENDED' || user.status === 'REJECTED') && <button className="approve-button" disabled={busy} onClick={() => onStatus(user, { status: 'ACTIVE', role: selectedRole })}>Kích hoạt</button>}
              <button className="icon-button danger" title="Xóa tài khoản" disabled={busy || user.id === currentUserId} onClick={() => onDelete(user)}><Icon name="trash" size={17} /></button>
            </div></td>
          </tr>
        })}</tbody>
      </table>
    </div>
  )
}
