import Icon from '../common/Icon'

export default function CampaignTimelineFields({ value, onChange }) {
  const add = () => onChange([...value, { id: `milestone-${Date.now()}`, title: '', date: '' }])
  const update = (id, field, nextValue) => onChange(value.map((milestone) => milestone.id === id ? { ...milestone, [field]: nextValue } : milestone))
  const remove = (id) => onChange(value.filter((milestone) => milestone.id !== id))
  return <div className="campaign-repeatable"><div className="campaign-repeatable-heading"><div><strong>Các mốc timeline</strong><small>Thêm những thời điểm cần theo dõi trong Campaign.</small></div><button type="button" onClick={add}><Icon name="plus" size={15} />Thêm mốc</button></div>{value.map((milestone, index) => <div className="campaign-repeatable-row timeline-row" key={milestone.id}><span>{String(index + 1).padStart(2, '0')}</span><label><small>Tên mốc</small><input value={milestone.title} onChange={(event) => update(milestone.id, 'title', event.target.value)} placeholder="Ví dụ: Duyệt danh sách Creator" /></label><label><small>Ngày</small><input type="date" value={milestone.date} onChange={(event) => update(milestone.id, 'date', event.target.value)} /></label><button type="button" aria-label="Xoá mốc" onClick={() => remove(milestone.id)}><Icon name="trash" size={16} /></button></div>)}{!value.length && <p className="campaign-repeatable-empty">Chưa có mốc timeline.</p>}</div>
}
