import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'
import Icon from '../components/common/Icon'
import { SIGNUP_DEPARTMENTS } from '../config/auth'
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../services/apiClient'
import { validateSignupForm } from '../utils/authValidation'

const INITIAL_FORM = { fullName: '', email: '', department: '', password: '', confirmPassword: '', acceptedTerms: false }

export default function SignupPage() {
  const navigate = useNavigate()
  const { signup, loginWithGoogle } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSubmitError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = validateSignupForm(form)
    if (Object.keys(nextErrors).length) return setErrors(nextErrors)
    setIsSubmitting(true)
    try {
      await signup({ name: form.fullName, email: form.email, password: form.password, department: form.department })
      navigate('/pending', { replace: true })
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Không thể gửi yêu cầu đăng ký.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const googleSignup = async (credential) => {
    const nextErrors = {}
    if (!form.department) nextErrors.department = 'Hãy chọn bộ phận trước khi đăng ký với Google.'
    if (!form.acceptedTerms) nextErrors.acceptedTerms = 'Bạn cần đồng ý với điều khoản sử dụng.'
    if (Object.keys(nextErrors).length) return setErrors((current) => ({ ...current, ...nextErrors }))
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const result = await loginWithGoogle({ credential, department: form.department, rememberMe: true })
      navigate(result.pending ? '/pending' : '/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Không thể đăng ký với Google.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-card auth-signup-card">
      <header><span className="auth-card-kicker">Tạo tài khoản</span><h2>Đăng ký</h2><p>Tài khoản mới sẽ vào danh sách chờ để Admin kiểm tra, gán Role và phê duyệt.</p></header>
      {submitError && <div className="auth-error-banner" role="alert"><Icon name="warning" size={17} /><span>{submitError}</span></div>}
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-form-grid">
          <AuthField label="Họ và tên" name="fullName" icon="users" autoComplete="name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} error={errors.fullName} placeholder="Nguyễn Minh Anh" />
          <AuthField label="Email công việc" name="email" icon="mail" type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} error={errors.email} placeholder="name@metaecom.vn" />
        </div>
        <label className={`auth-field${errors.department ? ' has-error' : ''}`}><span className="auth-field-label">Bộ phận</span><span className="auth-input-wrap auth-select-wrap"><Icon name="briefcase" size={18} /><select value={form.department} onChange={(event) => update('department', event.target.value)} aria-invalid={Boolean(errors.department)}><option value="">Chọn bộ phận làm việc của bạn</option>{SIGNUP_DEPARTMENTS.map((department) => <option value={department.value} key={department.value}>{department.label}</option>)}</select><Icon name="chevronDown" size={16} /></span>{errors.department ? <small className="auth-field-error" role="alert">{errors.department}</small> : <small className="auth-field-hint">Role sẽ do Admin cấp riêng, không tự động dựa trên bộ phận.</small>}</label>
        <div className="auth-form-grid">
          <AuthField label="Mật khẩu" name="password" icon="lock" type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} error={errors.password} placeholder="Tối thiểu 8 ký tự" />
          <AuthField label="Xác nhận mật khẩu" name="confirmPassword" icon="lock" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} error={errors.confirmPassword} placeholder="Nhập lại mật khẩu" />
        </div>
        <label className={`auth-checkbox auth-terms${errors.acceptedTerms ? ' has-error' : ''}`}><input type="checkbox" checked={form.acceptedTerms} onChange={(event) => update('acceptedTerms', event.target.checked)} /><span>Tôi đồng ý với <button type="button">Điều khoản sử dụng</button> và chính sách bảo mật dữ liệu nội bộ.</span></label>
        {errors.acceptedTerms && <small className="auth-field-error auth-terms-error" role="alert">{errors.acceptedTerms}</small>}
        <button type="submit" className="auth-submit-button" disabled={isSubmitting}>{isSubmitting ? 'Đang gửi yêu cầu...' : 'Tạo tài khoản'} {!isSubmitting && <Icon name="chevronRight" size={18} />}</button>
      </form>
      <div className="auth-divider"><span>hoặc đăng ký với Google</span></div>
      <GoogleSignInButton onCredential={googleSignup} disabled={isSubmitting} text="signup_with" />
      <p className="auth-switch-copy">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </section>
  )
}
