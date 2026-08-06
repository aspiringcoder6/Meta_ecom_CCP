import Icon from '../common/Icon'

export default function CreatorSummary({ creators }) {
  const activeProfiles = creators.filter((creator) => creator.status !== 'Archived').length
  const inCampaigns = creators.filter((creator) => creator.status === 'In campaign').length
  const averageEngagement = (creators.reduce((sum, creator) => sum + creator.engagement, 0) / creators.length).toFixed(1)

  return (
    <section className="creator-summary-strip">
      <div><span className="summary-icon"><Icon name="users" /></span><span><strong>{activeProfiles}</strong><small>Profile đang hoạt động</small></span></div><i />
      <div><span className="summary-icon"><Icon name="userCheck" /></span><span><strong>{inCampaigns}</strong><small>Trong Campaign</small></span></div><i />
      <div><span className="summary-icon"><Icon name="trending" /></span><span><strong>{averageEngagement}%</strong><small>Engagement trung bình</small></span></div>
    </section>
  )
}
