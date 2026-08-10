import { Link } from 'react-router-dom'
import Icon from '../components/common/Icon'

export default function UnauthorizedPage() {
  return <main className="page unauthorized-page"><span><Icon name="lock" size={31} /></span><h1>Không có quyền truy cập</h1><p>Role hiện tại không được phép mở khu vực này.</p><Link className="primary-button" to="/dashboard">Quay lại Dashboard</Link></main>
}
