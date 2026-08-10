import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/authApi'
import { clearCsrfToken, setCsrfToken } from '../services/apiClient'
import { AuthContext } from './authContext'

const PENDING_ACCOUNT_KEY = 'meta-ecom-pending-account'

function readPendingAccount() {
  try {
    return JSON.parse(window.sessionStorage.getItem(PENDING_ACCOUNT_KEY))
  } catch {
    return null
  }
}

function savePendingAccount(account) {
  if (account) window.sessionStorage.setItem(PENDING_ACCOUNT_KEY, JSON.stringify(account))
  else window.sessionStorage.removeItem(PENDING_ACCOUNT_KEY)
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [pendingAccount, setPendingAccountState] = useState(readPendingAccount)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  const setPendingAccount = useCallback((account) => {
    setPendingAccountState(account)
    savePendingAccount(account)
  }, [])

  const applySession = useCallback((data) => {
    setCsrfToken(data.csrfToken)
    setUser(data.user)
    setPendingAccount(null)
    return data.user
  }, [setPendingAccount])

  useEffect(() => {
    let active = true
    authApi.me()
      .then((data) => { if (active) applySession(data) })
      .catch(() => { if (active) { clearCsrfToken(); setUser(null) } })
      .finally(() => { if (active) setIsCheckingSession(false) })
    return () => { active = false }
  }, [applySession])

  const login = useCallback(async (payload) => {
    try {
      return applySession(await authApi.login(payload))
    } catch (error) {
      const responseError = error?.response?.data?.error
      if (responseError?.code === 'ACCOUNT_PENDING' || responseError?.code === 'ACCOUNT_REJECTED' || responseError?.code === 'ACCOUNT_SUSPENDED') {
        setPendingAccount(responseError.details?.account || { email: payload.identifier, status: responseError.code.replace('ACCOUNT_', '') })
      }
      throw error
    }
  }, [applySession, setPendingAccount])

  const signup = useCallback(async (payload) => {
    const data = await authApi.signup(payload)
    setPendingAccount(data.user)
    return data.user
  }, [setPendingAccount])

  const loginWithGoogle = useCallback(async (payload) => {
    const data = await authApi.google(payload)
    if (data.pending) {
      setPendingAccount(data.user)
      return { pending: true, user: data.user }
    }
    return { pending: false, user: applySession(data) }
  }, [applySession, setPendingAccount])

  const refreshSession = useCallback(async () => {
    try {
      const data = await authApi.me()
      return applySession(data)
    } catch (error) {
      clearCsrfToken()
      setUser(null)
      throw error
    }
  }, [applySession])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      window.google?.accounts?.id?.disableAutoSelect()
      clearCsrfToken()
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    pendingAccount,
    isCheckingSession,
    isAuthenticated: Boolean(user),
    login,
    signup,
    loginWithGoogle,
    logout,
    refreshSession,
    clearPendingAccount: () => setPendingAccount(null),
    isAdmin: user?.role === 'ADMIN',
    canManageCreators: user?.role === 'ADMIN',
  }), [user, pendingAccount, isCheckingSession, login, signup, loginWithGoogle, logout, refreshSession, setPendingAccount])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
