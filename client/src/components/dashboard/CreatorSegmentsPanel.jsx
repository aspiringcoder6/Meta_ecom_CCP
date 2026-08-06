const SEGMENTS = [
  { label: 'MASSIVE', colorClass: 'dot-navy', color: 'var(--navy)' },
  { label: 'TOP', colorClass: 'dot-blue', color: '#168fde' },
  { label: 'MINI', colorClass: 'dot-sky', color: 'var(--blue)' },
  { label: 'FREECAST', colorClass: 'dot-pale', color: '#cceaff' },
]

export default function CreatorSegmentsPanel({ creators }) {
  const total = creators.length
  const segments = SEGMENTS.map((segment) => {
    const count = creators.filter((creator) => creator.segment === segment.label).length
    return { ...segment, count, percent: total ? Math.round((count / total) * 100) : 0 }
  })
  let currentPercent = 0
  const donutStops = segments.map((segment) => {
    const start = currentPercent
    currentPercent += total ? (segment.count / total) * 100 : 0
    return `${segment.color} ${start}% ${currentPercent}%`
  })
  const donutBackground = total ? `conic-gradient(${donutStops.join(',')})` : '#edf2f7'

  return (
    <article className="panel segment-panel">
      <div className="panel-heading"><div><h2>Phân khúc Creator</h2><p>Cơ cấu Creator đang khả dụng</p></div></div>
      <div className="donut-wrap"><div className="donut" style={{ background: donutBackground }}><div><strong>{total}</strong><span>Tổng</span></div></div></div>
      <div className="segment-list">
        {segments.map((segment) => <div key={segment.label}><span><i className={`dot ${segment.colorClass}`} />{segment.label}</span><strong>{segment.count} · {segment.percent}%</strong></div>)}
      </div>
    </article>
  )
}
