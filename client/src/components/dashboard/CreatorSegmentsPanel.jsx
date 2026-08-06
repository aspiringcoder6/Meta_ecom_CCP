import { CREATOR_SEGMENTS } from '../../data/dashboard'
import Icon from '../common/Icon'

export default function CreatorSegmentsPanel() {
  return (
    <article className="panel segment-panel">
      <div className="panel-heading"><div><h2>Phân khúc Creator</h2><p>Cơ cấu mạng lưới</p></div><button className="subtle-icon"><Icon name="more" /></button></div>
      <div className="donut-wrap"><div className="donut"><div><strong>238</strong><span>Tổng</span></div></div></div>
      <div className="segment-list">
        {CREATOR_SEGMENTS.map((segment) => <div key={segment.label}><span><i className={`dot ${segment.colorClass}`} />{segment.label}</span><strong>{segment.value}</strong></div>)}
      </div>
    </article>
  )
}
