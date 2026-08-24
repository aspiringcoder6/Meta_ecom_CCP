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
  const timelineMetrics = useMemo(() => timeline.reduce((metrics, milestone) => {
    const tone = dueState(milestone.date, milestone.status).tone
    if (tone === 'completed') metrics.completed += 1
    else if (tone === 'overdue') metrics.overdue += 1
    else if (tone === 'due') metrics.dueSoon += 1
    else metrics.upcoming += 1
    return metrics
  }, { completed: 0, overdue: 0, dueSoon: 0, upcoming: 0 }), [timeline])
  const progress = timeline.length ? Math.round((timelineMetrics.completed / timeline.length) * 100) : 0
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
      <section className="campaign-detail-card campaign-timeline-card" data-tour="campaign-timeline-workspace">
        <header className="campaign-tab-heading timeline-heading"><div><span className="eyebrow">Campaign Schedule</span><h2>Timeline Campaign</h2><p>Theo dõi các mốc quan trọng, deadline và người phụ trách. Nếu cần chỉnh sửa timeline hãy bấm nút bên cạnh</p></div>{canEdit && !editing && <button type="button" className="secondary-button" onClick={() => setEditing(true)}><Icon name="edit" size={15} />Chỉnh sửa Timeline</button>}</header>
        {editing ? <div className="campaign-timeline-editor">
          <div className="timeline-editor-notice"><Icon name="bell" size={15} /><span>Milestone đến hạn trong 3 ngày sẽ tự động được đưa vào hệ thống thông báo.</span></div>
          <div className="milestone-suggestions"><span>Thêm nhanh:</span>{MILESTONE_SUGGESTIONS.map((title) => <button type="button" key={title} onClick={() => add(title)}><Icon name="plus" size={12} />{title}</button>)}</div>
          {draft.map((milestone, index) => <div className="milestone-editor-row" key={milestone.id}><span>{String(index + 1).padStart(2, '0')}</span><label><small>Milestone</small><input value={milestone.title || ''} onChange={(event) => update(milestone.id, 'title', event.target.value)} placeholder="Tên milestone" /></label><label><small>Ngày dự kiến</small><input type="date" value={milestone.date || ''} onChange={(event) => update(milestone.id, 'date', event.target.value)} /></label><label><small>Người phụ trách</small><input value={milestone.owner || ''} onChange={(event) => update(milestone.id, 'owner', event.target.value)} placeholder="Tên người phụ trách" /></label><label><small>Trạng thái</small><select value={milestone.status || 'UPCOMING'} onChange={(event) => update(milestone.id, 'status', event.target.value)}>{MILESTONE_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label><button type="button" onClick={() => remove(milestone.id)} aria-label="Xoá milestone"><Icon name="trash" size={15} /></button></div>)}
          {!draft.length && <p className="campaign-inline-empty">Chưa có milestone. Chọn một mốc gợi ý hoặc thêm milestone mới.</p>}
          <button type="button" className="timeline-add-custom" onClick={() => add()}><Icon name="plus" size={14} />Thêm milestone khác</button>
          {error && <p className="campaign-editor-error"><Icon name="warning" size={14} />{error}</p>}
          <footer><button type="button" className="secondary-button" onClick={cancel}>Huỷ</button><button type="button" className="primary-button" onClick={save}><Icon name="check" size={15} />Lưu Timeline</button></footer>
        </div> : <div className="campaign-timeline-layout">
          <aside className="timeline-summary-card">
            <span className="timeline-summary-icon"><Icon name="clock" size={22} /></span>
            <div><small>TIẾN ĐỘ TIMELINE</small><strong>{timelineMetrics.completed}/{timeline.length}</strong><p>milestone đã hoàn thành</p></div>
            <div className="timeline-progress-track"><i style={{ width: `${progress}%` }} /></div>
            <dl>
              <div><dt><i className="is-upcoming" />Sắp tới</dt><dd>{timelineMetrics.upcoming}</dd></div>
              <div><dt><i className="is-due" />Trong 3 ngày</dt><dd>{timelineMetrics.dueSoon}</dd></div>
              <div><dt><i className="is-overdue" />Quá hạn</dt><dd>{timelineMetrics.overdue}</dd></div>
              <div><dt><i className="is-completed" />Hoàn thành</dt><dd>{timelineMetrics.completed}</dd></div>
            </dl>
            <p className="timeline-summary-note"><Icon name="bell" size={13} />Các mốc sắp đến hạn sẽ xuất hiện trong Thông báo.</p>
          </aside>
          <div className="campaign-visual-timeline">
            {timeline.map((milestone, index) => { const due = dueState(milestone.date, milestone.status); return <article className={`timeline-milestone is-${due.tone}`} key={milestone.id}><span className="timeline-node"><i />{index < timeline.length - 1 && <b />}</span><div><header><span><small>MILESTONE {String(index + 1).padStart(2, '0')}</small><strong>{milestone.title}</strong></span><em>{due.label}</em></header><p><span><Icon name="clock" size={14} />{formatCampaignDate(milestone.date)}</span><span><Icon name="users" size={14} />{milestone.owner || 'Chưa gán người phụ trách'}</span></p></div></article> })}
            {!timeline.length && <div className="campaign-inline-empty"><Icon name="clock" size={24} /><strong>Chưa có milestone</strong><span>Bấm Chỉnh sửa Timeline để thêm mốc đầu tiên.</span></div>}
          </div>
        </div>}
      </section>
    </div>
  )
}
