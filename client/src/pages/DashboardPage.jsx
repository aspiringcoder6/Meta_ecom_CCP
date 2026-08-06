import { useNavigate } from 'react-router-dom'
import BookingBySegmentPanel from '../components/dashboard/BookingBySegmentPanel'
import CreatorSegmentsPanel from '../components/dashboard/CreatorSegmentsPanel'
import CreatorsToWatch from '../components/dashboard/CreatorsToWatch'
import GmvCategoryPanel from '../components/dashboard/GmvCategoryPanel'
import MetricCard from '../components/dashboard/MetricCard'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { calculateBookingPricing } from '../utils/pricing'
import { formatAudience, formatCompactCurrency } from '../utils/formatters'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { creators } = useApp()
  const availableCreators = creators.filter((creator) => creator.status !== 'Archived')
  const totalFollowers = availableCreators.reduce((total, creator) => total + creator.followers, 0)
  const totalGmv = availableCreators.reduce((total, creator) => total + creator.gmvMonth, 0)
  const totalBookingExpense = availableCreators.reduce((total, creator) => total + calculateBookingPricing(creator.cost, creator.extraCost).bookingExpense, 0)
  const averageFollowers = availableCreators.length ? totalFollowers / availableCreators.length : 0
  const averageBooking = availableCreators.length ? totalBookingExpense / availableCreators.length : 0
  const gmvEfficiency = totalBookingExpense ? totalGmv / totalBookingExpense : 0
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <main className="page dashboard-page">
      <section className="page-heading dashboard-heading">
        <div><p className="page-kicker">{today}</p><h1 className='font-bold'>Tổng quan Creator</h1><p className='font-bold'>Theo dõi quy mô của mạng lưới Creators, GMV và Booking Expense theo tháng</p></div>
        <button className="primary-button" onClick={() => navigate('/creators')}><Icon name="users" />Quản lý Creator</button>
      </section>
      <section className="metrics-grid">
        <MetricCard icon="users" label="Tổng số Creator" value={String(creators.length)} trend={`${availableCreators.length} khả dụng`} trendLabel={`${creators.length - availableCreators.length} Creator đang lưu trữ`} />
        <MetricCard icon="trending" label="Tổng Followers" value={formatAudience(totalFollowers)} trend={`${formatAudience(averageFollowers)} TB`} trendLabel="Followers trung bình / Creator" tone="navy" />
        <MetricCard icon="sparkles" label="Tổng GMV / Month" value={formatCompactCurrency(totalGmv)} trend={`${gmvEfficiency.toFixed(1)}x`} trendLabel="GMV / Booking Expense" tone="mint" />
        <MetricCard icon="briefcase" label="Booking Expense dự kiến" value={formatCompactCurrency(totalBookingExpense)} trend={formatCompactCurrency(averageBooking)} trendLabel="Chi phí trung bình / Creator" tone="warm" />
      </section>
      <section className="dashboard-grid dashboard-grid-primary"><GmvCategoryPanel creators={availableCreators} /><CreatorSegmentsPanel creators={availableCreators} /></section>
      <section className="dashboard-grid dashboard-grid-secondary"><CreatorsToWatch creators={availableCreators} /><BookingBySegmentPanel creators={availableCreators} /></section>
    </main>
  )
}
