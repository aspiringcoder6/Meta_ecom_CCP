import { effectiveClientDecision } from '../config/campaigns.js'
import { normalizeProducts, sameProducts } from './campaignProducts.js'

export function clientResponseChanges(creator, response) {
  if (!response) return null
  const changes = {}
  if (response.decision !== effectiveClientDecision(creator)) changes.decision = response.decision
  if ((response.note || '').trim() !== (creator.clientNote || '').trim()) changes.note = (response.note || '').trim()
  if (!sameProducts(response.brandProducts, creator.brandProducts)) changes.brandProducts = normalizeProducts(response.brandProducts)
  return Object.keys(changes).length ? { creatorId: creator.creatorId, ...changes } : null
}
