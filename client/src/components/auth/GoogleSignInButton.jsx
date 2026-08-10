import { useEffect, useRef, useState } from 'react'

const GOOGLE_SCRIPT_ID = 'google-identity-services'

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export default function GoogleSignInButton({ onCredential, disabled = false, text = 'signin_with' }) {
  const hostRef = useRef(null)
  const callbackRef = useRef(onCredential)
  const [loadError, setLoadError] = useState('')
  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()

  useEffect(() => { callbackRef.current = onCredential }, [onCredential])

  useEffect(() => {
    let active = true
    if (!clientId || disabled) return undefined
    loadGoogleIdentity().then((google) => {
      if (!active || !hostRef.current) return
      google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callbackRef.current(credential) })
      hostRef.current.replaceChildren()
      google.accounts.id.renderButton(hostRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text, shape: 'rectangular', width: String(Math.min(400, hostRef.current.clientWidth)),
      })
    }).catch(() => { if (active) setLoadError('Không thể tải Google Sign-In.') })
    return () => { active = false }
  }, [clientId, disabled, text])

  if (!clientId) return <p className="google-config-note">Google Sign-In sẽ hoạt động sau khi cấu hình <code>VITE_GOOGLE_CLIENT_ID</code>.</p>
  if (loadError) return <p className="auth-inline-error">{loadError}</p>
  return <div className={`google-signin-host${disabled ? ' is-disabled' : ''}`} ref={hostRef} aria-busy={!window.google?.accounts?.id} />
}
