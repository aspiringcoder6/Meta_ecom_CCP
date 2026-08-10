const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginForm(form) {
  const errors = {}
  if (!form.identifier.trim()) errors.identifier = 'Hãy nhập email hoặc username.'
  if (!form.password) errors.password = 'Mật khẩu không được để trống.'
  return errors
}

export function validateSignupForm(form) {
  const errors = {}
  if (form.fullName.trim().length < 2) errors.fullName = 'Họ và tên cần có ít nhất 2 ký tự.'
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Hãy nhập email công việc hợp lệ.'
  if (!form.department) errors.department = 'Hãy chọn bộ phận của bạn.'
  if (form.password.length < 8) errors.password = 'Mật khẩu cần có ít nhất 8 ký tự.'
  else if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Cần có chữ hoa, chữ thường và ít nhất một số.'
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu xác nhận chưa khớp.'
  if (!form.acceptedTerms) errors.acceptedTerms = 'Bạn cần đồng ý với điều khoản sử dụng.'
  return errors
}
