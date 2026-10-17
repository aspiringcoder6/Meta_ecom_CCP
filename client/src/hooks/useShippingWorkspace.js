import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '../services/apiClient'

const keyFor = (scope) => `meta-ecom-shipping-draft-v1:${encodeURIComponent(scope)}`
function read(scope) {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope)))
    if (value?.version !== 1 || !value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts)) return {}
    return Object.fromEntries(Object.entries(value.drafts).filter(([, entry]) => entry?.base && typeof entry.base.id === 'string' && entry.changes && typeof entry.changes === 'object'))
  } catch { return {} }
}
export const emptyShipment = (creator) => ({ id: crypto.randomUUID(), creatorId: creator.creatorId, revision: 0, status: 'NOT_SENT', carrier: '', trackingCode: '', sentDate: '', expectedDate: '', receivedDate: '', note: '', teamReceipt: 'UNCONFIRMED', items: (creator.brandProducts || []).map((product) => ({ product, quantity: 1, receivedQuantity: 0 })) })

export default function useShippingWorkspace(scope, api, initialUnread = false) {
  const [query, setQuery] = useState({ page: 1, pageSize: 25, search: '', filters: '{}', unread: initialUnread ? '1' : '' })
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [reload, setReload] = useState(0), [drafts, setDrafts] = useState(() => read(scope))
  const [issues, setIssues] = useState({}), [saving, setSaving] = useState(false), [storageOk, setStorageOk] = useState(true)
  const [lastSaved, setLastSaved] = useState('')
  const refs = useRef({ drafts, issues, api, busy: false, timer: null, sequence: Math.max(0, ...Object.values(drafts).map((entry) => Number(entry.sequence) || 0)), active: true })
  refs.current.api = api
  const cached = useRef(new Map())
  const persist = useCallback((next) => {
    refs.current.drafts = next; setDrafts(next)
    try {
      const compact = Object.fromEntries(Object.entries(next).map(([id, entry]) => {
        const { events: _events, ...base } = entry.base
        return [id, { ...entry, base }]
      }))
      if (Object.keys(next).length) localStorage.setItem(keyFor(scope), JSON.stringify({ version: 1, drafts: compact }))
      else localStorage.removeItem(keyFor(scope))
      setStorageOk(true)
    }
    catch { setStorageOk(false) }
  }, [scope])
  const setProblems = (next) => { refs.current.issues = next; setIssues(next) }
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true); setError('')
      refs.current.api.load(query).then((value) => {
        if (!active) return
        value.creators.forEach((creator) => cached.current.set(creator.creatorId, creator))
        setData(value)
      }).catch((error) => { if (active) setError(getApiErrorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    }, query.search ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [query, reload])
  const flush = useCallback(async () => {
    if (refs.current.busy) return
    const pending = Object.entries(refs.current.drafts).filter(([id, draft]) => !refs.current.issues[id] && draft.base && (draft.changes.items || draft.base.items)?.length).slice(0, 20)
    if (!pending.length) return
    refs.current.busy = true; setSaving(true)
    const sent = Object.fromEntries(pending)
    try {
      const result = await refs.current.api.save(pending.map(([id, draft]) => ({ id, creatorId: draft.base.creatorId, expectedRevision: draft.base.revision || 0, changes: draft.changes })))
      const next = { ...refs.current.drafts }, problems = { ...refs.current.issues }
      for (const shipment of result.saved) {
        const current = next[shipment.id]
        if (current?.sequence === sent[shipment.id]?.sequence) delete next[shipment.id]
        else if (current) next[shipment.id] = { ...current, base: shipment }
        delete problems[shipment.id]
        const creator = cached.current.get(shipment.creatorId)
        if (creator) {
          const previous = creator.shipments?.find((item) => item.id === shipment.id)
          cached.current.set(shipment.creatorId, { ...creator, shipments: [...(creator.shipments || []).filter((item) => item.id !== shipment.id), { ...previous, ...shipment }] })
        }
      }
      for (const issue of result.errors) if (next[issue.id]?.sequence === sent[issue.id]?.sequence) problems[issue.id] = issue
      if (refs.current.active) {
        setData((old) => old ? { ...old, creators: old.creators.map((creator) => cached.current.get(creator.creatorId) || creator) } : old)
        persist(next); setProblems(problems); if (result.saved.length) setLastSaved(new Date().toLocaleTimeString('vi-VN'))
      }
    } catch (error) {
      if (refs.current.active) setProblems({ ...refs.current.issues, ...Object.fromEntries(pending.filter(([id, entry]) => refs.current.drafts[id]?.sequence === entry.sequence).map(([id]) => [id, { message: getApiErrorMessage(error), code: 'NETWORK_ERROR' }])) })
    } finally {
      refs.current.busy = false
      if (refs.current.active) { setSaving(false); refs.current.timer = setTimeout(() => void flush(), 800) }
    }
  }, [persist])
  useEffect(() => {
    const current = refs.current
    clearTimeout(current.timer)
    current.timer = setTimeout(() => void flush(), 800)
    return () => clearTimeout(current.timer)
  }, [drafts, flush])
  useEffect(() => { refs.current.active = true; const current = refs.current; return () => { current.active = false; clearTimeout(current.timer) } }, [])
  const change = (base, changes) => {
    const current = refs.current.drafts[base.id]
    const next = { base: current?.base || base, changes: { ...(current?.changes || {}), ...changes }, sequence: ++refs.current.sequence }
    const problems = { ...refs.current.issues }; delete problems[base.id]; setProblems(problems)
    persist({ ...refs.current.drafts, [base.id]: next })
  }
  const discard = (id) => { const next = { ...refs.current.drafts }; delete next[id]; persist(next); const problems = { ...refs.current.issues }; delete problems[id]; setProblems(problems) }
  const retry = (id, serverValue) => {
    const current = refs.current.drafts[id]
    if (current && serverValue) persist({ ...refs.current.drafts, [id]: { ...current, base: serverValue, sequence: ++refs.current.sequence } })
    const problems = { ...refs.current.issues }; delete problems[id]; setProblems(problems); setTimeout(() => void flush(), 0)
  }
  const refresh = useCallback(() => setReload((value) => value + 1), [])
  const resolveHandles = async (handles) => {
    const lookup = { page: 1, pageSize: 100, search: '', filters: '{}', unread: '', handles: JSON.stringify([...new Set(handles)].slice(0, 200)) }
    const first = await refs.current.api.load(lookup)
    const creators = [...first.creators]
    if (first.pagination.pages > 1) creators.push(...(await refs.current.api.load({ ...lookup, page: 2 })).creators)
    creators.forEach((creator) => cached.current.set(creator.creatorId, creator))
    return creators
  }
  return { data, loading, error, query, setQuery, drafts, issues, saving, storageOk, lastSaved, change, discard, retry,
    refresh, resolveHandles, cached: cached.current,
  }
}
