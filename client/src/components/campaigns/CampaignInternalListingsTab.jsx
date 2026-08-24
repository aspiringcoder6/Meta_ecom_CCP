import { useEffect, useMemo, useState } from 'react'
import { calculateBookingPricing } from '../../utils/pricing'
import { formatCompactCurrency, formatNumber } from '../../utils/formatters'
import { toCreatorList } from '../../utils/creatorLists'
import { parseCategoryPaths } from '../../utils/creatorCategoryPaths'
import Icon from '../common/Icon'
import CategoryPathRibbons from '../creators/CategoryPathRibbons'
import CampaignCreatorSelector from './CampaignCreatorSelector'

const EDITABLE_FIELDS = ['quotedCost', 'quotedExtraCost', 'scope', 'pic']

function editValues(assignment) {
  return {
    quotedCost: assignment.quotedCost ?? '',
    quotedExtraCost: assignment.quotedExtraCost ?? '',
    scope: assignment.scope || '',
    pic: assignment.pic || '',
  }
}

function hasChanged(assignment, draft) {
  return EDITABLE_FIELDS.some((field) => String(editValues(assignment)[field]) !== String(draft[field] ?? ''))
}

function createQuickRow() {
  return {
    tempId: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '', tiktokLink: '', tiktokId: '', segment: 'MINI', category: '', type: 'VIDEO',
    followers: '', gmvMonth: '', cost: '', extraCost: '', scope: '', contact: '', pic: '', mcnNote: '',
  }
}

function normalizedDuplicateValue(value) {
  return String(value || '').trim().toLocaleLowerCase('vi').replace(/\/$/, '')
}

function normalizedDuplicateId(value) {
  return normalizedDuplicateValue(value).replace(/^@/, '')
}

function validateQuickRows(rows, creators) {
  const errors = {}
  const existingIds = new Set(creators.map((creator) => normalizedDuplicateId(creator.tiktokId)))
  const existingLinks = new Set(creators.map((creator) => normalizedDuplicateValue(creator.tiktokLink)))
  const seenIds = new Set()
  const seenLinks = new Set()
  rows.forEach((row) => {
    const rowErrors = {}
    const id = normalizedDuplicateId(row.tiktokId)
    const link = normalizedDuplicateValue(row.tiktokLink)
    if (!id) rowErrors.tiktokId = 'ID TikTok là bắt buộc.'
    else if (existingIds.has(id) || seenIds.has(id)) rowErrors.tiktokId = 'ID TikTok đã tồn tại.'
    if (!link) rowErrors.tiktokLink = 'Link TikTok là bắt buộc.'
    else if (existingLinks.has(link) || seenLinks.has(link)) rowErrors.tiktokLink = 'Link TikTok đã tồn tại.'
    if (id) seenIds.add(id)
    if (link) seenLinks.add(link)
    if (Object.keys(rowErrors).length) errors[row.tempId] = rowErrors
  })
  return errors
}

function quickRowForm(row) {
  return {
    name: row.name.trim(), handle: row.tiktokId.trim(), tiktokLink: row.tiktokLink.trim(), segment: row.segment || 'MINI',
    category: parseCategoryPaths(row.category, ['OTHER']), type: toCreatorList(row.type, ['VIDEO']),
    cost: row.cost, extraCost: row.extraCost, followers: row.followers, gmvMonth: row.gmvMonth,
    scope: row.scope, contact: row.contact, concept: '', productFocus: '', historicalCampaign: 'Đã hợp tác',
    mcnNote: row.mcnNote, engagement: '', email: '', phone: '',
  }
}

function ReadonlyValue({ children, hint }) {
  return <span className="internal-readonly-value"><strong>{children}</strong>{hint && <small>{hint}</small>}</span>
}

export default function CampaignInternalListingsTab({ campaign, creators, canEdit, onAddCreators, onQuickAdd, onRemoveCreator, onUpdateCreator, onMarkChangesRead, onNotify }) {
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [highlightedIds, setHighlightedIds] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [quickRows, setQuickRows] = useState([])
  const [quickErrors, setQuickErrors] = useState({})

  useEffect(() => {
    const unreadIds = (campaign.creators || []).filter((creator) => creator.clientChangeUnread).map((creator) => String(creator.creatorId))
    if (!unreadIds.length) return
    setHighlightedIds((current) => [...new Set([...current, ...unreadIds])])
    onMarkChangesRead()
  }, [campaign.creators, onMarkChangesRead])

  const sourceById = useMemo(() => new Map(creators.map((creator) => [String(creator.id), creator])), [creators])
  const orderedCreators = useMemo(() => [...(campaign.creators || [])].sort((left, right) => Number(highlightedIds.includes(String(right.creatorId))) - Number(highlightedIds.includes(String(left.creatorId)))), [campaign.creators, highlightedIds])
  const picOptions = useMemo(() => [...new Set([campaign.owner, ...orderedCreators.map((item) => item.pic)].filter(Boolean))], [campaign.owner, orderedCreators])

  const beginEditing = () => {
    setDrafts(Object.fromEntries(orderedCreators.map((assignment) => [String(assignment.creatorId), editValues(assignment)])))
    setIsEditing(true)
  }
  const addQuickRow = () => {
    if (!isEditing) beginEditing()
    setQuickRows((current) => [...current, createQuickRow()])
    setSelectorOpen(false)
  }
  const updateDraft = (creatorId, field, value) => setDrafts((current) => ({ ...current, [String(creatorId)]: { ...(current[String(creatorId)] || {}), [field]: value } }))
  const updateQuickRow = (tempId, field, value) => {
    setQuickRows((current) => current.map((row) => row.tempId === tempId ? { ...row, [field]: value } : row))
    setQuickErrors((current) => ({ ...current, [tempId]: { ...(current[tempId] || {}), [field]: '' } }))
  }
  const cancelEditing = () => {
    setDrafts({})
    setQuickRows([])
    setQuickErrors({})
    setIsEditing(false)
    onNotify?.('Đã hủy các thay đổi trong Internal Listings')
  }
  const saveEditing = async () => {
    const errors = validateQuickRows(quickRows, creators)
    if (Object.keys(errors).length) {
      setQuickErrors(errors)
      onNotify?.('Vui lòng sửa các dòng Thêm nhanh đang được bôi đỏ')
      return
    }
    setIsSaving(true)
    try {
      let changedCount = 0
      orderedCreators.forEach((assignment) => {
        const draft = drafts[String(assignment.creatorId)] || editValues(assignment)
        if (!hasChanged(assignment, draft)) return
        changedCount += 1
        onUpdateCreator(assignment.creatorId, {
          quotedCost: draft.quotedCost === '' ? null : Number(draft.quotedCost),
          quotedExtraCost: draft.quotedExtraCost === '' ? null : Number(draft.quotedExtraCost),
          scope: draft.scope.trim(), pic: draft.pic,
        })
      })
      for (const row of quickRows) {
        const savedCreator = await onQuickAdd(quickRowForm(row))
        onUpdateCreator(savedCreator.id, {
          quotedCost: row.cost === '' ? null : Number(row.cost),
          quotedExtraCost: row.extraCost === '' ? null : Number(row.extraCost),
          scope: row.scope.trim(), pic: row.pic,
        })
        setQuickRows((current) => current.filter((item) => item.tempId !== row.tempId))
      }
      setDrafts({})
      setQuickRows([])
      setQuickErrors({})
      setIsEditing(false)
      onNotify?.(`Đã lưu ${changedCount} thay đổi và thêm ${quickRows.length} Creator mới`)
    } catch (error) {
      onNotify?.(error instanceof Error ? error.message : 'Không thể lưu dòng Creator mới.')
    } finally {
      setIsSaving(false)
    }
  }
  const confirmSelection = (ids) => {
    onAddCreators(ids)
    setSelectorOpen(false)
  }

  const totals = orderedCreators.reduce((current, assignment) => {
    const source = sourceById.get(String(assignment.creatorId))
    const draft = isEditing ? drafts[String(assignment.creatorId)] : null
    const cost = draft?.quotedCost !== undefined && draft.quotedCost !== '' ? draft.quotedCost : assignment.quotedCost !== '' && assignment.quotedCost != null ? assignment.quotedCost : source?.cost
    const extraCost = draft?.quotedExtraCost !== undefined && draft.quotedExtraCost !== '' ? draft.quotedExtraCost : assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? assignment.quotedExtraCost : source?.extraCost
    const pricing = calculateBookingPricing(cost, extraCost)
    return { expense: current.expense + pricing.bookingExpense, agi: current.agi + pricing.agi }
  }, { expense: 0, agi: 0 })

  return (
    <div className="campaign-detail-tab campaign-internal-listings-tab">
      <section className="campaign-detail-card internal-listings-card" data-tour="campaign-internal-workspace">
        <header className="campaign-tab-heading internal-listings-heading">
          <div><span className="eyebrow">Campaign Workspace</span><h2>Internal Listings</h2><p>Chọn creator, chỉnh giá trước khi gửi cho Client. Nếu chưa có trong hệ thống, bấm vào nút thêm nhanh.</p></div>
          <div className="internal-listings-toolbar" data-tour="campaign-internal-actions">
            <span className="internal-listings-total"><small>Tổng Expense</small><strong>{formatCompactCurrency(totals.expense)}</strong></span>
            <span className="internal-listings-total"><small>Tổng AGI</small><strong>{formatCompactCurrency(totals.agi)}</strong></span>
            {canEdit && !isEditing && <button type="button" className="secondary-button" onClick={beginEditing}><Icon name="edit" size={15} />Chỉnh sửa</button>}
            {canEdit && isEditing && <><button type="button" className="secondary-button is-danger-soft" disabled={isSaving} onClick={cancelEditing}><Icon name="close" size={15} />Hủy thay đổi</button><button type="button" className="primary-button is-success" disabled={isSaving} onClick={saveEditing}><Icon name="check" size={15} />{isSaving ? 'Đang lưu...' : 'Hoàn tất'}</button></>}
            {canEdit && <button type="button" className="secondary-button" onClick={addQuickRow}><Icon name="plus" size={15} />Thêm nhanh</button>}
            {canEdit && <button type="button" className="primary-button" onClick={() => setSelectorOpen(true)}><Icon name="users" size={15} />Thêm Creator</button>}
          </div>
        </header>

        {isEditing && <div className="internal-edit-notice"><Icon name="edit" size={15} /><span>Chỉnh trực tiếp các ô xanh hoặc thêm một dòng Creator mới. Dòng mới chỉ được đồng bộ vào kho Creator sau khi bấm Hoàn tất.</span></div>}

        <div className="campaign-assignment-table-wrap internal-listings-table-wrap" data-tour="campaign-internal-table">
          <table className="campaign-assignment-table internal-listings-table">
            <thead><tr><th>Link TikTok</th><th>ID TikTok</th><th>Segment</th><th>Category</th><th>Type</th><th>Followers</th><th>GMV / Month</th><th>Cost</th><th>Extra/FOC</th><th>Cast</th><th>Expense</th><th>AGI</th><th>Scope</th><th>Contact</th><th>PIC</th><th>MCN Note</th><th /></tr></thead>
            <tbody>
              {quickRows.map((row) => {
                const pricing = calculateBookingPricing(row.cost, row.extraCost)
                const errors = quickErrors[row.tempId] || {}
                return <tr className="internal-quick-row" key={row.tempId}>
                  <td><label className={`internal-edit-cell internal-text-cell ${errors.tiktokLink ? 'has-error' : ''}`}><input value={row.tiktokLink} onChange={(event) => updateQuickRow(row.tempId, 'tiktokLink', event.target.value)} placeholder="Link TikTok *" />{errors.tiktokLink && <small>{errors.tiktokLink}</small>}</label></td>
                  <td><div className="internal-quick-identity"><label className={`internal-edit-cell internal-text-cell ${errors.tiktokId ? 'has-error' : ''}`}><input value={row.tiktokId} onChange={(event) => updateQuickRow(row.tempId, 'tiktokId', event.target.value)} placeholder="ID TikTok *" />{errors.tiktokId && <small>{errors.tiktokId}</small>}</label><input value={row.name} onChange={(event) => updateQuickRow(row.tempId, 'name', event.target.value)} placeholder="Tên Creator" /></div></td>
                  <td><label className="internal-edit-cell internal-select-cell"><select value={row.segment} onChange={(event) => updateQuickRow(row.tempId, 'segment', event.target.value)}><option>MINI</option><option>TOP</option><option>MASSIVE</option><option>FREECAST</option></select></label></td>
                  <td><label className="internal-edit-cell internal-text-cell"><input value={row.category} onChange={(event) => updateQuickRow(row.tempId, 'category', event.target.value)} placeholder="Category > Subcategory" /></label></td>
                  <td><label className="internal-edit-cell internal-select-cell"><select value={row.type} onChange={(event) => updateQuickRow(row.tempId, 'type', event.target.value)}><option>VIDEO</option><option>LIVESTREAM</option><option>VIDEO, LIVESTREAM</option></select></label></td>
                  <td><label className="internal-edit-cell"><input type="number" min="0" value={row.followers} onChange={(event) => updateQuickRow(row.tempId, 'followers', event.target.value)} placeholder="0" /></label></td>
                  <td><label className="internal-edit-cell"><input type="number" min="0" value={row.gmvMonth} onChange={(event) => updateQuickRow(row.tempId, 'gmvMonth', event.target.value)} placeholder="0" /></label></td>
                  <td><label className="internal-edit-cell"><input type="number" min="0" value={row.cost} onChange={(event) => updateQuickRow(row.tempId, 'cost', event.target.value)} placeholder="0" /><span>₫</span></label></td>
                  <td><label className="internal-edit-cell"><input type="number" min="0" value={row.extraCost} onChange={(event) => updateQuickRow(row.tempId, 'extraCost', event.target.value)} placeholder="0" /><span>₫</span></label></td>
                  <td><ReadonlyValue hint="Tự tính">{formatCompactCurrency(pricing.totalCast)}</ReadonlyValue></td><td><ReadonlyValue hint="Tự tính">{formatCompactCurrency(pricing.bookingExpense)}</ReadonlyValue></td><td><ReadonlyValue hint="Expense − Cast">{formatCompactCurrency(pricing.agi)}</ReadonlyValue></td>
                  <td><label className="internal-edit-cell internal-text-cell"><input value={row.scope} onChange={(event) => updateQuickRow(row.tempId, 'scope', event.target.value)} placeholder="Scope" /></label></td>
                  <td><label className="internal-edit-cell internal-text-cell"><input value={row.contact} onChange={(event) => updateQuickRow(row.tempId, 'contact', event.target.value)} placeholder="Contact" /></label></td>
                  <td><label className="internal-edit-cell internal-select-cell"><select value={row.pic} onChange={(event) => updateQuickRow(row.tempId, 'pic', event.target.value)}><option value="">Chưa gán</option>{picOptions.map((pic) => <option value={pic} key={pic}>{pic}</option>)}</select></label></td>
                  <td><label className="internal-edit-cell internal-text-cell"><input value={row.mcnNote} onChange={(event) => updateQuickRow(row.tempId, 'mcnNote', event.target.value)} placeholder="MCN Note" /></label></td>
                  <td><div className="campaign-assignment-actions"><button type="button" className="is-danger" onClick={() => setQuickRows((current) => current.filter((item) => item.tempId !== row.tempId))} title="Xóa dòng nháp"><Icon name="trash" size={15} /></button></div></td>
                </tr>
              })}
              {orderedCreators.map((assignment) => {
                const source = sourceById.get(String(assignment.creatorId)) || assignment
                const creatorId = String(assignment.creatorId)
                const draft = drafts[creatorId] || editValues(assignment)
                const effectiveCost = draft.quotedCost !== '' ? draft.quotedCost : assignment.quotedCost !== '' && assignment.quotedCost != null ? assignment.quotedCost : source.cost
                const effectiveExtraCost = draft.quotedExtraCost !== '' ? draft.quotedExtraCost : assignment.quotedExtraCost !== '' && assignment.quotedExtraCost != null ? assignment.quotedExtraCost : source.extraCost
                const pricing = calculateBookingPricing(effectiveCost, effectiveExtraCost)
                const highlighted = highlightedIds.includes(creatorId)
                return <tr className={`${highlighted ? 'is-client-updated' : ''} ${isEditing ? 'is-editing' : ''}`} key={creatorId}>
                  <td><a className="internal-tiktok-link" href={source.tiktokLink || '#'} target="_blank" rel="noreferrer" title={source.tiktokLink}>{source.tiktokLink || '—'}</a></td>
                  <td><ReadonlyValue hint={source.name}>@{String(source.tiktokId || assignment.tiktokId || '').replace(/^@/, '')}</ReadonlyValue>{highlighted && <em className="internal-updated-badge">Brand vừa cập nhật</em>}</td>
                  <td><span className="segment-tag">{source.segment || '—'}</span></td><td><CategoryPathRibbons values={source.category || []} level={2} /></td><td><div className="internal-type-list">{toCreatorList(source.type, ['—']).map((type) => <span key={type}>{type}</span>)}</div></td>
                  <td><ReadonlyValue>{formatNumber(source.followers)}</ReadonlyValue></td><td><ReadonlyValue>{formatCompactCurrency(source.gmvMonth)}</ReadonlyValue></td>
                  <td>{isEditing ? <label className="internal-edit-cell"><input type="number" min="0" value={draft.quotedCost} onChange={(event) => updateDraft(creatorId, 'quotedCost', event.target.value)} placeholder={formatNumber(source.cost || 0)} /><span>₫</span></label> : <ReadonlyValue hint={assignment.quotedCost === '' || assignment.quotedCost == null ? 'Gợi ý từ kho Creator' : 'Cost Campaign'}>{formatCompactCurrency(effectiveCost)}</ReadonlyValue>}</td>
                  <td>{isEditing ? <label className="internal-edit-cell"><input type="number" min="0" value={draft.quotedExtraCost} onChange={(event) => updateDraft(creatorId, 'quotedExtraCost', event.target.value)} placeholder={formatNumber(source.extraCost || 0)} /><span>₫</span></label> : <ReadonlyValue hint={assignment.quotedExtraCost === '' || assignment.quotedExtraCost == null ? 'Gợi ý từ kho Creator' : 'Extra/FOC Campaign'}>{formatCompactCurrency(effectiveExtraCost)}</ReadonlyValue>}</td>
                  <td><ReadonlyValue hint="Tự tính">{formatCompactCurrency(pricing.totalCast)}</ReadonlyValue></td><td><ReadonlyValue hint="Tự tính">{formatCompactCurrency(pricing.bookingExpense)}</ReadonlyValue></td><td><ReadonlyValue hint="Expense − Cast">{formatCompactCurrency(pricing.agi)}</ReadonlyValue></td>
                  <td>{isEditing ? <label className="internal-edit-cell internal-text-cell"><input value={draft.scope} onChange={(event) => updateDraft(creatorId, 'scope', event.target.value)} placeholder={source.scope || 'Điền Scope'} /></label> : <ReadonlyValue>{assignment.scope || source.scope || '—'}</ReadonlyValue>}</td>
                  <td><ReadonlyValue>{source.contact || '—'}</ReadonlyValue></td>
                  <td>{isEditing ? <label className="internal-edit-cell internal-select-cell"><select value={draft.pic} onChange={(event) => updateDraft(creatorId, 'pic', event.target.value)}><option value="">Chưa gán</option>{picOptions.map((pic) => <option value={pic} key={pic}>{pic}</option>)}</select></label> : <ReadonlyValue>{assignment.pic || 'Chưa gán'}</ReadonlyValue>}</td>
                  <td><ReadonlyValue>{source.mcnNote || '—'}</ReadonlyValue></td>
                  <td>{canEdit && <div className="campaign-assignment-actions"><button type="button" className="is-danger" onClick={() => { if (window.confirm(`Xoá ${assignment.name} khỏi Campaign?`)) onRemoveCreator(assignment.creatorId) }} title="Xoá khỏi Campaign"><Icon name="trash" size={15} /></button></div>}</td>
                </tr>
              })}
            </tbody>
          </table>
          {!orderedCreators.length && !quickRows.length && <div className="campaign-inline-empty"><Icon name="users" size={24} /><strong>Chưa có Creator</strong><span>Thêm từ kho Creator hoặc tạo một dòng mới bằng Thêm nhanh.</span></div>}
        </div>
      </section>
      {selectorOpen && <CampaignCreatorSelector creators={creators} assignedIds={(campaign.creators || []).map((creator) => creator.creatorId)} onClose={() => setSelectorOpen(false)} onConfirm={confirmSelection} onQuickAdd={addQuickRow} />}
    </div>
  )
}
