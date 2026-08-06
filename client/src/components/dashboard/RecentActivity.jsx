import { ACTIVITIES } from '../../data/dashboard'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'

export default function RecentActivity() {
  return (
    <article className="panel activity-panel">
      <div className="panel-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật Creator mới nhất</p></div><button className="subtle-icon"><Icon name="more" /></button></div>
      <div className="activity-list">
        {ACTIVITIES.map((activity, index) => (
          <div className="activity-item" key={activity.title}><Avatar creator={activity} size="small" /><div><strong>{activity.title}</strong><small>{activity.time}</small></div>{index < 2 && <span className="unread-dot" />}</div>
        ))}
      </div>
    </article>
  )
}
