export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'] },
  { path: '/creators', label: 'Creators', icon: 'users', roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'] },
  { path: '/campaigns', label: 'Campaigns', icon: 'briefcase', roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'] },
  { path: '/deliverables', label: 'Deliverables', icon: 'checkSquare', roles: ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER'] },
  { path: '/reviews', label: 'Client Review', icon: 'message', count: 3, roles: ['ADMIN', 'CAMPAIGN_MANAGER'] },
  { path: '/team', label: 'Tài khoản & phân quyền', icon: 'team', roles: ['ADMIN'] },
]

export const PAGE_META = {
  '/dashboard': { label: 'Dashboard', icon: 'dashboard' },
  '/creators': { label: 'Creator Management', icon: 'users' },
  '/campaigns': { label: 'Campaigns', icon: 'briefcase' },
  '/deliverables': { label: 'Deliverables', icon: 'checkSquare' },
  '/reviews': { label: 'Client Review', icon: 'message' },
  '/team': { label: 'Tài khoản & phân quyền', icon: 'team' },
  '/settings': { label: 'Cài đặt', icon: 'settings' },
}

export const ROLE_LABELS = {
  ADMIN: 'Quản trị hệ thống',
  CAMPAIGN_MANAGER: 'Campaign Manager',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}
