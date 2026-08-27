import { CREATOR_SEGMENTS } from '../../config/labels'

export default function CampaignSegmentGoalsField({ value = {}, onChange, disabled = false }) {
  const goals = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const updateGoal = (segment, rawValue) => {
    const next = { ...goals }
    if (rawValue === '') delete next[segment]
    else next[segment] = Math.max(0, Math.trunc(Number(rawValue) || 0))
    onChange(next)
  }

  return (
    <div className="campaign-segment-goals-field">
      {CREATOR_SEGMENTS.map((segment) => <label key={segment}>
        <span>{segment}</span>
        <input type="number" min="0" step="1" disabled={disabled} value={goals[segment] ?? ''} onChange={(event) => updateGoal(segment, event.target.value)} placeholder="0" />
        <small>Creator</small>
      </label>)}
    </div>
  )
}
