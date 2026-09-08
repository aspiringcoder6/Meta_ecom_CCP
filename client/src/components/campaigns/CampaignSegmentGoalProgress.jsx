import Icon from '../common/Icon'

const SEGMENT_ORDER = ['TOP', 'MASSIVE', 'MINI', 'FREECAST']

function campaignSegmentGoalState(campaign) {
  const goals = Object.entries(campaign?.segmentGoals || {})
    .map(([segment, target]) => ({ segment: String(segment).toUpperCase(), target: Math.max(0, Number(target) || 0) }))
    .filter((item) => item.target > 0)
    .sort((left, right) => {
      const leftIndex = SEGMENT_ORDER.indexOf(left.segment)
      const rightIndex = SEGMENT_ORDER.indexOf(right.segment)
      if (leftIndex === -1 && rightIndex === -1) return left.segment.localeCompare(right.segment, 'vi')
      if (leftIndex === -1) return 1
      if (rightIndex === -1) return -1
      return leftIndex - rightIndex
    })
  const counts = (campaign?.creators || []).reduce((result, creator) => {
    const segment = String(creator.segment || '').toUpperCase()
    result[segment] = (result[segment] || 0) + 1
    return result
  }, {})
  const totalTarget = goals.reduce((sum, item) => sum + item.target, 0)
  const achieved = goals.reduce((sum, item) => sum + Math.min(counts[item.segment] || 0, item.target), 0)
  return { goals, counts, totalTarget, achieved, progress: totalTarget ? Math.round((achieved / totalTarget) * 100) : 0 }
}

export default function CampaignSegmentGoalProgress({ campaign, compact = false }) {
  const state = campaignSegmentGoalState(campaign)
  return (
    <section className={`campaign-segment-goals-progress ${compact ? 'is-compact' : ''}`} data-tour="campaign-segment-goals">
      <header>
        <span><Icon name="trending" size={18} /></span>
        <div><small>MỤC TIÊU CREATOR THEO SEGMENT</small><strong>{state.totalTarget ? `${state.achieved}/${state.totalTarget} Creator` : 'Chưa thiết lập mục tiêu'}</strong></div>
        {state.totalTarget > 0 && <em>{state.progress}%</em>}
      </header>
      {state.totalTarget > 0 ? <>
        <div className="campaign-segment-goal-track"><i style={{ width: `${state.progress}%` }} /></div>
        <div className="campaign-segment-goal-items">{state.goals.map((goal) => {
          const current = state.counts[goal.segment] || 0
          const complete = current >= goal.target
          return <article className={complete ? 'is-complete' : ''} key={goal.segment}><span>{goal.segment}</span><strong>{current}<small>/{goal.target}</small></strong><i style={{ width: `${Math.min(100, Math.round(current / goal.target * 100))}%` }} /></article>
        })}</div>
      </> : <p>Thiết lập số lượng TOP, MASSIVE, MINI hoặc FREECAST trong tab Thông tin.</p>}
    </section>
  )
}
