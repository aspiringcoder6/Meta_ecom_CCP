import { useState } from 'react'
import Icon from '../common/Icon'

export default function AuthField({ label, name, icon, error, type = 'text', hint, ...inputProps }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && passwordVisible ? 'text' : type

  return (
    <label className={`auth-field${error ? ' has-error' : ''}`}>
      <span className="auth-field-label">{label}</span>
      <span className="auth-input-wrap">
        <Icon name={icon} size={18} />
        <input name={name} type={inputType} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...inputProps} />
        {isPassword && <button type="button" className="password-toggle" onClick={() => setPasswordVisible((current) => !current)} aria-label={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><Icon name={passwordVisible ? 'eyeOff' : 'eye'} size={18} /></button>}
      </span>
      {error ? <small className="auth-field-error" id={`${name}-error`} role="alert">{error}</small> : hint && <small className="auth-field-hint">{hint}</small>}
    </label>
  )
}
