import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function useCampaignUpdates({ eventsUrl, getRevision, onChange, onExpired, enabled = true, isBrand = false }) {
  const callbacks = useRef({ getRevision, onChange, onExpired })
  const [status, setStatus] = useState('connecting')
  useLayoutEffect(() => { callbacks.current = { getRevision, onChange, onExpired } }, [getRevision, onChange, onExpired])
  useEffect(() => {
    if (!enabled || !eventsUrl) return undefined
    let source, fallback, active = true, busy = false, revision = null
    const receive = (value) => {
      if (!active || !value) return
      if (value !== revision) { const initial = revision === null; revision = value; if (!initial) callbacks.current.onChange?.() }
    }
    const check = async () => {
      if (busy || document.hidden || !active) return
      busy = true
      try { receive((await callbacks.current.getRevision()).revision) } catch { setStatus('offline') }
      finally { busy = false }
    }
    const stop = () => { source?.close(); clearInterval(fallback) }
    const connect = () => {
      stop()
      if (document.hidden || !active) return
      setStatus('connecting')
      // Retain the last revision across visibility reconnects so missed updates are detected.
      if (typeof EventSource !== 'undefined') {
        source = new EventSource(eventsUrl, { withCredentials: !isBrand })
        source.addEventListener('revision', (event) => {
          setStatus('live')
          try { receive(JSON.parse(event.data).revision) } catch { /* Ignore malformed events. */ }
        })
        source.addEventListener('expired', () => { stop(); setStatus('expired'); callbacks.current.onExpired?.() })
        source.onerror = () => setStatus('reconnecting')
      }
      // A light fallback for networks/proxies that block event streams; never reload a full Campaign on a timer.
      void check()
      fallback = setInterval(check, 15000)
    }
    connect()
    document.addEventListener('visibilitychange', connect)
    return () => { active = false; stop(); document.removeEventListener('visibilitychange', connect) }
  }, [eventsUrl, enabled, isBrand])
  return status
}
