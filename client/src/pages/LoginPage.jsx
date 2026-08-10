import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import Icon from '../components/common/Icon'
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../services/apiClient'
import { validateLoginForm } from '../utils/authValidation'

const INITIAL_FORM = { identifier: '', password: '', rememberMe: true }

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const handleAuthError = (error) => {
    const code = error?.response?.data?.error?.code
    if (['ACCOUNT_PENDING', 'ACCOUNT_REJECTED', 'ACCOUNT_SUSPENDED'].includes(code)) {
      navigate('/pending', { replace: true })
      return
    }
    setSubmitError(getApiErrorMessage(error, 'Không thể đăng nhập. Vui lòng thử lại.'))
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateLoginForm(form)
    if (Object.keys(nextErrors).length) return setErrors(nextErrors)
    setIsSubmitting(true)
    try {
      await login(form)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const googleLogin = async (credential) => {
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const result = await loginWithGoogle({ credential, rememberMe: form.rememberMe })
      navigate(result.pending ? '/pending' : (location.state?.from || '/dashboard'), { replace: true })
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card">
      <header><span className="auth-card-kicker">Chào mừng trở lại</span><h2>Đăng nhập</h2><p>Truy cập workspace theo Role đã được Admin cấp cho tài khoản của bạn.</p></header>
      {location.state?.accountCreated && <div className="auth-success-banner"><Icon name="check" size={17} /><span>Yêu cầu tạo tài khoản đã được gửi đến Admin.</span></div>}
      {submitError && <div className="auth-error-banner" role="alert"><Icon name="warning" size={17} /><span>{submitError}</span></div>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <AuthField label="Email hoặc username" name="identifier" icon="mail" autoComplete="username" value={form.identifier} onChange={(event) => update('identifier', event.target.value)} error={errors.identifier} placeholder="name@metaecom.vn hoặc username" />
        <AuthField label="Mật khẩu" name="password" icon="lock" type="password" autoComplete="current-password" value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} placeholder="Nhập mật khẩu" />
        <div className="auth-form-options"><label className="auth-checkbox"><input type="checkbox" checked={form.rememberMe} onChange={(event) => update('rememberMe', event.target.checked)} /><span>Ghi nhớ đăng nhập</span></label><button type="button" className="auth-text-button" title="Tính năng sẽ được bổ sung sau">Quên mật khẩu?</button></div>
        <button type="submit" className="auth-submit-button" disabled={isSubmitting}>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'} {!isSubmitting && <Icon name="chevronRight" size={18} />}</button>
      </form>
      <div className="auth-divider"><span>hoặc đăng nhập với</span></div>
      <GoogleSignInButton onCredential={googleLogin} disabled={isSubmitting} />
      <p className="auth-switch-copy">Chưa có tài khoản? <Link to="/signup">Đăng ký</Link></p>
    </section>
  )
}
