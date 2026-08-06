const VALUES = [128, 143, 151, 168, 184, 197, 213, 238]
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
const MAX_VALUE = 260

export default function CreatorGrowthChart() {
  const points = VALUES.map((value, index) => `${30 + index * 68},${184 - (value / MAX_VALUE) * 144}`).join(' ')
  const areaPoints = `30,184 ${points} 506,184`

  return (
    <div className="chart-wrap">
      <div className="chart-axis"><span>260</span><span>195</span><span>130</span><span>65</span><span>0</span></div>
      <svg className="growth-chart" viewBox="0 0 536 205" preserveAspectRatio="none" role="img" aria-label="Tăng trưởng Creator từ tháng 1 đến tháng 8">
        <defs><linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#52baff" stopOpacity="0.28" /><stop offset="100%" stopColor="#52baff" stopOpacity="0" /></linearGradient></defs>
        {[40, 76, 112, 148, 184].map((y) => <line key={y} x1="30" x2="510" y1={y} y2={y} stroke="#e7edf5" strokeWidth="1" />)}
        <polygon points={areaPoints} fill="url(#chartArea)" />
        <polyline points={points} fill="none" stroke="#148ce0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {VALUES.map((value, index) => <circle key={value} cx={30 + index * 68} cy={184 - (value / MAX_VALUE) * 144} r={index === VALUES.length - 1 ? 5 : 3} fill="#fff" stroke="#148ce0" strokeWidth={index === VALUES.length - 1 ? 3 : 2} />)}
      </svg>
      <div className="chart-months">{MONTHS.map((month) => <span key={month}>{month}</span>)}</div>
      <span className="chart-tooltip">238 Creator</span>
    </div>
  )
}
