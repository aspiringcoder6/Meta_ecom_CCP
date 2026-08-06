import Icon from '../common/Icon'
import CreatorGrowthChart from './CreatorGrowthChart'

export default function CreatorGrowthPanel() {
  return (
    <article className="panel growth-panel">
      <div className="panel-heading">
        <div><h2>Tăng trưởng Creator</h2><p>Mạng lưới Creator của bạn đang tăng trưởng ổn định.</p></div>
        <button className="select-button">8 tháng gần nhất <Icon name="chevronDown" size={15} /></button>
      </div>
      <div className="growth-summary"><strong>+110</strong><span>Creator kể từ tháng 1</span></div>
      <CreatorGrowthChart />
    </article>
  )
}
