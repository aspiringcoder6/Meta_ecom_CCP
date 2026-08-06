import { useNavigate } from 'react-router-dom'
import CreatorGrowthPanel from '../components/dashboard/CreatorGrowthPanel'
import CreatorSegmentsPanel from '../components/dashboard/CreatorSegmentsPanel'
import CreatorsToWatch from '../components/dashboard/CreatorsToWatch'
import MetricCard from '../components/dashboard/MetricCard'
import RecentActivity from '../components/dashboard/RecentActivity'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { creators } = useApp()

  return (
    <main className="page dashboard-page">
      <section className="page-heading dashboard-heading">
        <div><p className="page-kicker">Thứ Tư, 5 tháng 8</p><h1>Chào buổi sáng, Hiếu</h1><p>Đây là tình hình Creator Network của bạn hôm nay.</p></div>
        <button className="primary-button" onClick={() => navigate('/creators')}><Icon name="users" />Khám phá Creator</button>
      </section>
      <section className="metrics-grid">
        <MetricCard icon="users" label="Tổng số Creator" value="238" trend="+12.4%" trendLabel="so với tháng trước" />
        <MetricCard icon="userCheck" label="Hợp tác đang hoạt động" value="46" trend="+8.2%" trendLabel="so với tháng trước" tone="navy" />
        <MetricCard icon="trending" label="Engagement trung bình" value="7.8%" trend="+1.1%" trendLabel="trên tất cả kênh" tone="mint" />
        <MetricCard icon="sparkles" label="Creator mới trong tháng" value="24" trend="6 hồ sơ chờ duyệt" trendLabel="profile Creator" tone="warm" />
      </section>
      <section className="dashboard-grid dashboard-grid-primary"><CreatorGrowthPanel /><CreatorSegmentsPanel /></section>
      <section className="dashboard-grid dashboard-grid-secondary"><CreatorsToWatch creators={creators} /><RecentActivity /></section>
    </main>
  )
}
