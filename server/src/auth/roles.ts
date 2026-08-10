export const ACCOUNT_ROLES = ['ADMIN', 'CAMPAIGN_MANAGER', 'MEMBER', 'VIEWER'] as const
export type AccountRole = (typeof ACCOUNT_ROLES)[number]

export const ROLE_DETAILS: Record<AccountRole, { label: string; description: string }> = {
  ADMIN: { label: 'Admin', description: 'Toàn quyền quản trị hệ thống và dữ liệu.' },
  CAMPAIGN_MANAGER: { label: 'Campaign Manager', description: 'Quản lý Campaign, Creator được gán, tiến độ và báo cáo.' },
  MEMBER: { label: 'Member', description: 'Thực thi task, xem Creator và báo cáo được phân công.' },
  VIEWER: { label: 'Viewer', description: 'Chỉ xem Dashboard và báo cáo.' },
}

export function isAccountRole(value: unknown): value is AccountRole {
  return ACCOUNT_ROLES.includes(String(value) as AccountRole)
}
