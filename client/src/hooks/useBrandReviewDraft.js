import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createBrandReviewDraft, writeBrandReviewDraft } from '../utils/brandReviewDraft'

export default function useBrandReviewDraft(token, campaign, responses, feedback, ready) {
  const latest = useRef(null)
  const [status, setStatus] = useState({ ok: true, count: 0 })
  useLayoutEffect(() => { latest.current = ready && campaign ? { token, campaign, responses, feedback } : null }, [token, campaign, responses, feedback, ready])
  const flush = useCallback(() => {
    const state = latest.current
    if (!state) return
    const draft = createBrandReviewDraft(state.campaign, state.responses, state.feedback)
    setStatus(writeBrandReviewDraft(state.token, draft))
  }, [])
  useEffect(() => {
    if (!ready) return undefined
    const timer = window.setTimeout(flush, 250)
    return () => window.clearTimeout(timer)
  }, [campaign, responses, feedback, ready, flush])
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVisibility) }
  }, [flush])
  return status
}
