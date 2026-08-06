import { useLocation } from 'react-router-dom'
import Icon from '../components/common/Icon'
import { PAGE_META } from '../config/navigation'

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const page = PAGE_META[pathname] || { label: 'Không tìm thấy trang', icon: 'sparkles' }

  return (
    <main className="page empty-page">
      <div className="empty-card">
        <span className="empty-icon"><Icon name={page.icon} size={30} /></span><span className="eyebrow">Sẽ có trong giai đoạn tiếp theo</span>
        <h1>{page.label}</h1><p>Workspace này đã sẵn sàng cho module tiếp theo. Trong bản UI demo hiện tại, bạn có thể sử dụng đầy đủ Dashboard và khu vực Creators.</p>
        <div className="empty-progress"><span /></div><small>Workspace dự kiến · Chưa kết nối</small>
      </div>
    </main>
  )
}
