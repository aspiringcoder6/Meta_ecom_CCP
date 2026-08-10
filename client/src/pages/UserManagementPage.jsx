import { useCallback, useEffect, useMemo, useState } from 'react'
import CreateUserModal from '../components/users/CreateUserModal'
import UserManagementTable from '../components/users/UserManagementTable'
import Icon from '../components/common/Icon'
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../services/apiClient'
import { userApi } from '../services/userApi'

const FILTERS = [{ value: '', label: 'Tất cả' }, { value: 'PENDING', label: 'Chờ duyệt' }, { value: 'ACTIVE', label: 'Đang hoạt động' }, { value: 'SUSPENDED', label: 'Tạm ngưng' }, { value: 'REJECTED', label: 'Đã từ chối' }]

export default function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, active: 0, suspended: 0 })
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState({})
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nextUsers, nextMetrics] = await Promise.all([userApi.list(), userApi.metrics()])
      setUsers(nextUsers)
      setMetrics(nextMetrics)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách tài khoản.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleUsers = useMemo(() => users.filter((user) => {
    if (filter && user.status !== filter) return false
    const term = search.trim().toLowerCase()
    return !term || `${user.name} ${user.email} ${user.username || ''}`.toLowerCase().includes(term)
  }), [users, filter, search])

  const updateUser = async (target, changes) => {
    setBusyId(target.id)
    try {
      const updated = await userApi.update(target.id, changes)
      setUsers((current) => current.map((item) => item.id === target.id ? updated : item))
      const nextMetrics = await userApi.metrics()
      setMetrics(nextMetrics)
      setError('')
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật tài khoản.'))
      setSelectedRoles((current) => {
        const next = { ...current }
        delete next[target.id]
        return next
      })
      await load()
    } finally {
      setBusyId('')
    }
  }

  const rejectUser = (target) => {
    const reason = window.prompt(`Lý do từ chối ${target.name}:`, 'Thông tin đăng ký chưa phù hợp.')
    if (reason !== null) void updateUser(target, { status: 'REJECTED', rejectionReason: reason })
  }

  const deleteUser = async (target) => {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${target.email}?`)) return
    setBusyId(target.id)
    try {
      await userApi.remove(target.id)
      await load()
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa tài khoản.'))
    } finally {
      setBusyId('')
    }
  }

  const createUser = async (payload) => {
    await userApi.create(payload)
    await load()
  }

  return (
    <main className="page user-management-page">
      <section className="page-heading user-page-heading"><div><span className="eyebrow">SYSTEM ADMINISTRATION</span><h1>Tài khoản & phân quyền</h1><p>Duyệt yêu cầu đăng ký, gán Role và quản lý quyền truy cập workspace.</p></div><button className="primary-button" onClick={() => setCreateOpen(true)}><Icon name="plus" />Thêm tài khoản</button></section>
      <section className="user-metrics">
        <article><span><Icon name="users" /></span><div><small>Tổng tài khoản</small><strong>{metrics.total}</strong></div></article>
        <article className="pending"><span><Icon name="clock" /></span><div><small>Đang chờ duyệt</small><strong>{metrics.pending}</strong></div></article>
        <article><span><Icon name="userCheck" /></span><div><small>Đang hoạt động</small><strong>{metrics.active}</strong></div></article>
        <article><span><Icon name="lock" /></span><div><small>Tạm ngưng</small><strong>{metrics.suspended}</strong></div></article>
      </section>
      <section className="user-list-panel">
        <header><div className="user-filter-tabs">{FILTERS.map((item) => <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}{item.value === 'PENDING' && metrics.pending > 0 ? <span>{metrics.pending}</span> : null}</button>)}</div><label className="user-search"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email, username..." /></label></header>
        {error && <div className="user-page-error"><Icon name="warning" size={18} /><span>{error}</span><button onClick={load}>Thử lại</button></div>}
        {loading ? <div className="user-list-loading">Đang tải danh sách tài khoản...</div> : <UserManagementTable users={visibleUsers} currentUserId={currentUser.id} selectedRoles={selectedRoles} onSelectRole={(id, role) => setSelectedRoles((current) => ({ ...current, [id]: role }))} onApprove={(target, role) => updateUser(target, { status: 'ACTIVE', role })} onReject={rejectUser} onStatus={updateUser} onDelete={deleteUser} busyId={busyId} />}
      </section>
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createUser} />
    </main>
  )
}
