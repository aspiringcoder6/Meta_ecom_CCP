import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { publicReviewApi } from '../services/publicReviewApi'
import { getApiErrorMessage } from '../services/apiClient'
import { acknowledgeWorkspaceDraft, readWorkspaceDraft, writeWorkspaceDraft } from '../utils/brandWorkspaceDraft'
import { reviewLoadFailure } from '../utils/publicReviewLoad'
import useCampaignUpdates from './useCampaignUpdates'

const emptyQuery = () => ({ page: 1, pageSize: 25, search: '', filters: {}, sort: [] })
export default function useBrandPortal(token) {
  const [tab, setTab] = useState('listing'), [queries, setQueries] = useState({ listing: emptyQuery(), deliverables: emptyQuery() })
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(null)
  const [reload, setReload] = useState(0), [retrying, setRetrying] = useState(false), [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(() => readWorkspaceDraft(token)), [storageStatus, setStorageStatus] = useState({ ok: true, count: 0 })
  const [submission, setSubmission] = useState(null), [message, setMessage] = useState('')
  const cache = useRef(new Map()), latestDraft = useRef(draft), submitting = useRef(false)
  const query = queries[tab] || emptyQuery()
  const queryKey = JSON.stringify({ ...query, tab })
  useLayoutEffect(() => { latestDraft.current = draft }, [draft])
  useEffect(() => {
    const timer = setTimeout(() => setStorageStatus(writeWorkspaceDraft(token, latestDraft.current)), 250)
    return () => clearTimeout(timer)
  }, [draft, token])
  useEffect(() => {
    const persist = () => setStorageStatus(writeWorkspaceDraft(token, latestDraft.current))
    const onVisibility = () => { if (document.hidden) persist() }
    window.addEventListener('pagehide', persist); document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', onVisibility); writeWorkspaceDraft(token, latestDraft.current) }
  }, [token])
  useEffect(() => {
    if (tab === 'shipping') return undefined
    const controller = new AbortController()
    const values = JSON.parse(queryKey)
    const timer = setTimeout(() => {
      setLoading(true); setLoadError(null); setRetrying(false)
      publicReviewApi.workspace(token, { ...values, filters: JSON.stringify(values.filters), sort: JSON.stringify(values.sort) }, { signal: controller.signal, onRetry: () => setRetrying(true) }).then((value) => {
        if (controller.signal.aborted) return
        value.creators.forEach((row) => cache.current.set(row.creatorId, { ...cache.current.get(row.creatorId), ...row }))
        setData(value)
        // Migrate old local drafts only when that KOC has actually been loaded for comparison.
        setDraft((old) => {
          let changed = false; const listing = { ...old.listing }, feedback = { ...old.feedback }
          for (const row of value.creators) {
            if (listing[row.creatorId] && !Number.isInteger(listing[row.creatorId].expectedRevision)) { listing[row.creatorId] = { ...listing[row.creatorId], expectedRevision: row.revision }; changed = true }
            for (const [key, item] of Object.entries(feedback)) if (item.creatorId === row.creatorId && !Number.isInteger(item.expectedRevision)) { feedback[key] = { ...item, expectedRevision: row.revision }; changed = true }
          }
          return changed ? { version: 2, listing, feedback } : old
        })
      }).catch((error) => { if (!controller.signal.aborted) setLoadError(reviewLoadFailure(error)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, values.search ? 300 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [token, tab, queryKey, reload])
  const refresh = useCallback(() => setReload((value) => value + 1), [])
  const liveStatus = useCampaignUpdates({ eventsUrl: publicReviewApi.eventsUrl(token), getRevision: () => publicReviewApi.revision(token), onChange: refresh, isBrand: true,
    onExpired: () => setLoadError({ invalid: true, title: 'Link đã bị thu hồi', message: 'Vui lòng liên hệ team Meta Ecom để lấy link mới.' }),
  })
  const changeQuery = (changes) => setQueries((old) => ({ ...old, [tab]: { ...old[tab], ...changes } }))
  const editListing = useCallback((row, field, value) => {
    setMessage('')
    setDraft((old) => {
      const listing = { ...old.listing }, changes = { ...listing[row.creatorId]?.changes, [field]: value }
      const saved = field === 'decision' ? row.clientDecision : field === 'note' ? row.clientNote : row.brandProducts.join(', ')
      if (value === saved) delete changes[field]
      if (Object.keys(changes).length) listing[row.creatorId] = { expectedRevision: listing[row.creatorId]?.expectedRevision ?? row.revision, changes }
      else delete listing[row.creatorId]
      return { ...old, listing }
    })
  }, [])
  const editFeedback = useCallback((row, item, value) => {
    setMessage('')
    setDraft((old) => {
      const feedback = { ...old.feedback }, key = `${row.creatorId}:${item.id}`
      if (value === (item.brandFeedback || '')) delete feedback[key]
      else feedback[key] = { creatorId: row.creatorId, id: item.id, expectedRevision: feedback[key]?.expectedRevision ?? row.revision, value }
      return { ...old, feedback }
    })
  }, [])
  const rebase = useCallback((creatorId, discard = false) => {
    const row = cache.current.get(creatorId)
    setDraft((old) => {
      const listing = { ...old.listing }, feedback = { ...old.feedback }
      if (discard) delete listing[creatorId]
      else if (listing[creatorId]) listing[creatorId] = { ...listing[creatorId], expectedRevision: row.revision }
      for (const [key, entry] of Object.entries(feedback)) if (entry.creatorId === creatorId) {
        if (discard) delete feedback[key]; else feedback[key] = { ...entry, expectedRevision: row.revision }
      }
      return { version: 2, listing, feedback }
    })
    setSubmission((old) => old ? { ...old, errors: old.errors.filter((item) => item.creatorId !== creatorId) } : old)
  }, [])
  const submit = async () => {
    if (submitting.current) return
    const snapshot = latestDraft.current
    const listing = Object.entries(snapshot.listing).filter(([, item]) => Number.isInteger(item.expectedRevision)).map(([creatorId, item]) => ({ creatorId, expectedRevision: item.expectedRevision, ...item.changes }))
    const byCreator = new Map()
    for (const item of Object.values(snapshot.feedback)) {
      if (!Number.isInteger(item.expectedRevision)) continue
      if (!byCreator.has(item.creatorId)) byCreator.set(item.creatorId, { creatorId: item.creatorId, expectedRevision: item.expectedRevision, deliverables: [] })
      byCreator.get(item.creatorId).deliverables.push({ id: item.id, brandFeedback: item.value })
    }
    if (!(tab === 'listing' ? listing.length : byCreator.size)) { setMessage('Mở trang chứa các KOC có nháp cũ để đối chiếu dữ liệu trước khi gửi.'); return }
    submitting.current = true; setSaving(true)
    try {
      const result = tab === 'listing' ? await publicReviewApi.submit(token, listing) : await publicReviewApi.submitDeliverables(token, [...byCreator.values()])
      const receipt = result.submissionResult
      for (const row of result.creators) cache.current.set(row.creatorId, { ...cache.current.get(row.creatorId), ...row })
      setData((old) => ({ ...old, creators: old.creators.map((row) => cache.current.get(row.creatorId) || row) }))
      setDraft((old) => {
        const next = acknowledgeWorkspaceDraft(old, receipt)
        // Our own save increments the row version; retain unrelated other-tab drafts against that new version.
        for (const row of result.creators) {
          if (next.listing[row.creatorId]) next.listing[row.creatorId] = { ...next.listing[row.creatorId], expectedRevision: row.revision }
          for (const [key, item] of Object.entries(next.feedback)) if (item.creatorId === row.creatorId) next.feedback[key] = { ...item, expectedRevision: row.revision }
        }
        return next
      })
      setSubmission(receipt); setMessage(`Đã lưu ${receipt.savedCount} mục${receipt.errors?.length ? ` · ${receipt.errors.length} mục chưa lưu, xem lỗi bên trên` : ''}.`)
      refresh()
    } catch (error) { setMessage(`Chưa gửi được: ${getApiErrorMessage(error)}. Bản nháp vẫn được giữ.`) }
    finally { submitting.current = false; setSaving(false) }
  }
  const discardAll = () => { if (window.confirm('Xóa toàn bộ thay đổi chưa gửi? Dữ liệu đã lưu trên hệ thống không bị thay đổi.')) { setDraft({ version: 2, listing: {}, feedback: {} }); setSubmission(null); setMessage('Đã bỏ các thay đổi chưa gửi.') } }
  return { tab, changeTab: (value) => { if (!saving) { setTab(value); setMessage(''); setSubmission(null) } }, data, query, changeQuery,
    loading, retrying, loadError, refresh, reload, saving, draft, storageStatus, liveStatus, submission, message, editListing, editFeedback, rebase, submit, discardAll,
  }
}
