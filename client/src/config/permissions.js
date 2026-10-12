export function canManageWorkspace(role) {
  return ['ADMIN', 'CAMPAIGN_MANAGER'].includes(role)
}
