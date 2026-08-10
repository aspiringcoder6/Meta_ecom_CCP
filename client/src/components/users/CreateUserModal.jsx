import { useState } from 'react'
import { ROLE_LABELS } from '../../config/navigation'
import { SIGNUP_DEPARTMENTS } from '../../config/auth'
import { getApiErrorMessage } from '../../services/apiClient'
import Icon from '../common/Icon'

const ROLES = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER']
const INITIAL_FORM = { name: '', email: '', username: '', password: '', role: 'MEMBER', department: '' }

export default function CreateUserModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!open) return null

  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError('') }
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onCreate({ ...form, username: form.username || null, department: form.department || null })
      setForm(INITIAL_FORM)
      onClose()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo tài khoản.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
        <header><div><span>Tạo trực tiếp</span><h2 id="create-user-title">Thêm tài khoản</h2><p>Tài khoản do Admin tạo sẽ hoạt động ngay với Role được chọn.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Đóng"><Icon name="close" /></button></header>
        <form onSubmit={submit}>
          {error && <div className="auth-error-banner"><Icon name="warning" size={17} /><span>{error}</span></div>}
          <div className="user-form-grid">
            <label><span>Họ và tên</span><input required minLength="2" value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
            <label><span>Email</span><input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
            <label><span>Username (không bắt buộc)</span><input value={form.username} onChange={(event) => update('username', event.target.value)} /></label>
            <label><span>Mật khẩu ban đầu</span><input required type="password" minLength="8" placeholder="Có chữ hoa, chữ thường và số" value={form.password} onChange={(event) => update('password', event.target.value)} /></label>
            <label><span>Role</span><select value={form.role} onChange={(event) => update('role', event.target.value)}>{ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
            <label><span>Bộ phận</span><select value={form.department} onChange={(event) => update('department', event.target.value)}><option value="">Chưa xác định</option>{SIGNUP_DEPARTMENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          </div>
          <footer><button className="secondary-button" type="button" onClick={onClose}>Hủy</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</button></footer>
        </form>
      </section>
    </div>
  )
}
