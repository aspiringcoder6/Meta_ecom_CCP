const SEGMENTS = [
  { label: 'MASSIVE', colorClass: 'dot-navy' },
  { label: 'TOP', colorClass: 'dot-blue' },
  { label: 'MINI', colorClass: 'dot-sky' },
]

export default function CreatorSegmentsPanel({ creators }) {
  const total = creators.length
  const segments = SEGMENTS.map((segment) => {
    const count = creators.filter((creator) => creator.segment === segment.label).length
    return { ...segment, count, percent: total ? Math.round((count / total) * 100) : 0 }
  })
  const massiveEnd = segments[0]?.percent || 0
  const topEnd = massiveEnd + (segments[1]?.percent || 0)
  const donutBackground = `conic-gradient(var(--navy) 0 ${massiveEnd}%, #168fde ${massiveEnd}% ${topEnd}%, var(--blue) ${topEnd}% 100%)`

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
