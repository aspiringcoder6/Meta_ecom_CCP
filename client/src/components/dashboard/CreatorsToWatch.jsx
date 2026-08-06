import { useNavigate } from 'react-router-dom'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'

export default function CreatorsToWatch({ creators }) {
  const navigate = useNavigate()
  const topCreators = [...creators].filter((creator) => creator.status !== 'Archived').sort((a, b) => b.engagement - a.engagement).slice(0, 4)

  return (
    <article className="panel top-creators-panel">
      <div className="panel-heading"><div><h2>Creator đáng chú ý</h2><p>Engagement cao nhất trong mạng lưới</p></div><button className="text-button" onClick={() => navigate('/creators')}>Xem tất cả <Icon name="chevronRight" size={15} /></button></div>
      <div className="mini-table">
        {topCreators.map((creator, index) => (
          <button className="mini-table-row" key={creator.id} onClick={() => navigate('/creators')}>
            <span className="rank">{String(index + 1).padStart(2, '0')}</span><Avatar creator={creator} />
            <span className="creator-primary"><strong>{creator.name}</strong><small>{creator.handle}</small></span>
            <span className="platform-pill">{creator.platform}</span>
            <span className="engagement-cell"><strong>{creator.engagement}%</strong><small>Engagement</small></span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </article>
  )
}
