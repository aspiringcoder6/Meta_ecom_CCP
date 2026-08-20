import { useNavigate } from 'react-router-dom'
import CreateCampaignForm from '../components/campaigns/CreateCampaignForm'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { useAuth } from '../hooks/useAuth'

export default function CreateCampaignPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { creators, createCampaign } = useApp()
  const handleSubmit = async (form) => {
    await createCampaign(form)
    navigate('/campaigns')
  }
  return (
    <main className="page create-campaign-page">
      <section className="campaign-create-heading">
        <button type="button" onClick={() => navigate('/campaigns')}><Icon name="chevronRight" size={18} />Quay lại danh sách</button>
        <div><p className="page-kicker">Campaign Management</p><h1>Tạo Campaign mới</h1><p>Điền thông tin tạo draft cho một campaign mới.</p></div>
      </section>
      <CreateCampaignForm creators={creators} owner={user?.name || user?.username || ''} onSubmit={handleSubmit} onCancel={() => navigate('/campaigns')} />
    </main>
  )
}
