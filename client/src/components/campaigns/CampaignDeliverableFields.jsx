import { CONTENT_TYPES, DELIVERABLE_STATUSES } from '../../config/campaigns'
import Icon from '../common/Icon'

export default function CampaignDeliverableFields({ value, onChange }) {
  const add = () => onChange([...value, {
    id: `deliverable-${Date.now()}`,
    type: 'Video TikTok',
    description: '',
    deadline: '',
    status: 'NOT_STARTED',
    demoLink: '',
  }])
  const update = (id, field, nextValue) => onChange(value.map((item) => (
    item.id === id ? { ...item, [field]: nextValue } : item
  )))
  const remove = (id) => onChange(value.filter((item) => item.id !== id))

  return (
    <div className="campaign-repeatable">
      <div className="campaign-repeatable-heading">
        <div><strong>Deliverable</strong><small>Loại nội dung, deadline, trạng thái và link demo.</small></div>
        <button type="button" onClick={add}><Icon name="plus" size={15} />Thêm deliverable</button>
      </div>
      {value.map((item, index) => (
        <div className="campaign-repeatable-row deliverable-row" key={item.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <label><small>Loại nội dung</small><select value={item.type} onChange={(event) => update(item.id, 'type', event.target.value)}>{CONTENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><small>Deadline</small><input type="date" value={item.deadline} onChange={(event) => update(item.id, 'deadline', event.target.value)} /></label>
          <label><small>Trạng thái</small><select value={item.status} onChange={(event) => update(item.id, 'status', event.target.value)}>{DELIVERABLE_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
          <label><small>Link demo</small><input value={item.demoLink} onChange={(event) => update(item.id, 'demoLink', event.target.value)} placeholder="https://..." /></label>
          <label className="campaign-deliverable-description"><small>Mô tả nội dung</small><textarea rows="2" value={item.description || ''} onChange={(event) => update(item.id, 'description', event.target.value)} placeholder="Mô tả yêu cầu, định hướng hoặc nội dung cần bàn giao..." /></label>
          <button type="button" aria-label="Xoá deliverable" onClick={() => remove(item.id)}><Icon name="trash" size={16} /></button>
        </div>
      ))}
      {!value.length && <p className="campaign-repeatable-empty">Chưa có deliverable. Có thể bổ sung sau.</p>}
    </div>
  )
}
