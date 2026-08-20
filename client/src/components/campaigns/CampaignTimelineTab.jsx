import { useEffect, useMemo, useState } from 'react'
import { MILESTONE_STATUSES } from '../../config/campaigns'
import { formatCampaignDate } from '../../utils/campaigns'
import Icon from '../common/Icon'

const MILESTONE_SUGGESTIONS = ['Chốt Creator', 'Gửi brief', 'Duyệt kịch bản', 'Đăng bài', 'Nghiệm thu']

function dueState(date, status) {
  if (status === 'COMPLETED') return { label: 'Đã hoàn thành', tone: 'completed' }
  if (!date) return { label: 'Chưa có ngày', tone: 'neutral' }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(`${date}T00:00:00`)
  const days = Math.ceil((due - today) / 86400000)
  if (days < 0) return { label: `Trễ ${Math.abs(days)} ngày`, tone: 'overdue' }
  if (days === 0) return { label: 'Đến hạn hôm nay', tone: 'due' }
  if (days <= 3) return { label: `Còn ${days} ngày`, tone: 'due' }
  return { label: formatCampaignDate(date), tone: 'upcoming' }
}

export default function CampaignTimelineTab({ campaign, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(campaign.milestones || [])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!editing) setDraft(campaign.milestones || [])
  }, [campaign.id, campaign.milestones, editing])
  const timeline = useMemo(() => [...(campaign.milestones || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))), [campaign.milestones])
  const add = (title = '') => setDraft((current) => [...current, { id: `milestone-${Date.now()}-${current.length}`, title, date: '', owner: '', status: 'UPCOMING' }])
  const update = (id, field, value) => setDraft((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  const remove = (id) => setDraft((current) => current.filter((item) => item.id !== id))
  const save = () => {
    if (draft.some((item) => !item.title?.trim() || !item.date || !item.owner?.trim())) {
      setError('Mỗi milestone cần có tên, ngày dự kiến và người phụ trách.')
      return
    }
    onSave(draft.map((item) => ({ ...item, title: item.title.trim(), owner: item.owner.trim() })))
    setError('')
    setEditing(false)
  }
  const cancel = () => { setDraft(campaign.milestones || []); setError(''); setEditing(false) }

  return (
    <div className="campaign-detail-tab campaign-timeline-tab">
      <section className="campaign-detail-card">
        <header className="campaign-tab-heading"><div><h2>Timeline Campaign</h2><p>Milestone trong 3 ngày tới sẽ tự động được đưa vào thông báo.</p></div>{canEdit && !editing && <button className="secondary-button" onClick={() => setEditing(true)}><Icon name="edit" size={15} />Chỉnh sửa Timeline</button>}</header>
        {editing ? <div className="campaign-timeline-editor">
          <div className="milestone-suggestions"><span>Thêm nhanh:</span>{MILESTONE_SUGGESTIONS.map((title) => <button type="button" key={title} onClick={() => add(title)}><Icon name="plus" size={12} />{title}</button>)}</div>
          {draft.map((milestone, index) => <div className="milestone-editor-row" key={milestone.id}><span>{String(index + 1).padStart(2, '0')}</span><label><small>Milestone</small><input value={milestone.title || ''} onChange={(event) => update(milestone.id, 'title', event.target.value)} placeholder="Tên milestone" /></label><label><small>Ngày dự kiến</small><input type="date" value={milestone.date || ''} onChange={(event) => update(milestone.id, 'date', event.target.value)} /></label><label><small>Người phụ trách</small><input value={milestone.owner || ''} onChange={(event) => update(milestone.id, 'owner', event.target.value)} placeholder="Tên người phụ trách" /></label><label><small>Trạng thái</small><select value={milestone.status || 'UPCOMING'} onChange={(event) => update(milestone.id, 'status', event.target.value)}>{MILESTONE_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label><button type="button" onClick={() => remove(milestone.id)} aria-label="Xoá milestone"><Icon name="trash" size={15} /></button></div>)}
          {!draft.length && <p className="campaign-inline-empty">Chưa có milestone. Chọn một mốc gợi ý hoặc thêm milestone mới.</p>}
          <button type="button" className="timeline-add-custom" onClick={() => add()}><Icon name="plus" size={14} />Thêm milestone khác</button>
          {error && <p className="campaign-editor-error"><Icon name="warning" size={14} />{error}</p>}
          <footer><button type="button" className="secondary-button" onClick={cancel}>Huỷ</button><button type="button" className="primary-button" onClick={save}><Icon name="check" size={15} />Lưu Timeline</button></footer>
        </div> : <div className="campaign-visual-timeline">
          {timeline.map((milestone, index) => { const due = dueState(milestone.date, milestone.status); return <article className={`timeline-milestone is-${due.tone}`} key={milestone.id}><span className="timeline-node"><i /><b>{String(index + 1).padStart(2, '0')}</b></span><div><header><strong>{milestone.title}</strong><em>{due.label}</em></header><p><Icon name="clock" size={13} />{formatCampaignDate(milestone.date)}<span /> <Icon name="users" size={13} />{milestone.owner || 'Chưa gán người phụ trách'}</p></div></article> })}
          {!timeline.length && <p className="campaign-inline-empty">Chưa có milestone trong Timeline.</p>}
        </div>}
      </section>
    </div>
  )
}
