import { useMemo, useState } from 'react'
import { CAMPAIGN_CREATOR_STATUSES } from '../../config/campaigns'
import Avatar from '../common/Avatar'
import Icon from '../common/Icon'

function creatorMatches(creator, term) {
  return `${creator.name} ${creator.tiktokId} ${creator.segment}`.toLowerCase().includes(term)
}

export default function CampaignCreatorPicker({ creators, value, onChange }) {
  const [search, setSearch] = useState('')
  const selectedIds = useMemo(() => new Set(value.map((creator) => String(creator.creatorId))), [value])
  const results = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return []
    return creators.filter((creator) => !selectedIds.has(String(creator.id)) && creatorMatches(creator, term)).slice(0, 8)
  }, [creators, search, selectedIds])

  const addCreator = (creator) => {
    onChange([...value, { creatorId: creator.id, name: creator.name, tiktokId: creator.tiktokId, status: 'PROPOSED' }])
    setSearch('')
  }
  const updateStatus = (creatorId, status) => onChange(value.map((creator) => String(creator.creatorId) === String(creatorId) ? { ...creator, status } : creator))
  const remove = (creatorId) => onChange(value.filter((creator) => String(creator.creatorId) !== String(creatorId)))

  return (
    <div className="campaign-creator-picker">
      <label className="campaign-creator-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc ID TikTok để thêm Creator..." /></label>
      {search && <div className="campaign-creator-results">{results.map((creator) => <button type="button" key={creator.id} onClick={() => addCreator(creator)}><Avatar creator={creator} /><span><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')} · {creator.segment}</small></span><Icon name="plus" size={16} /></button>)}{!results.length && <p>Không tìm thấy Creator chưa được chọn.</p>}</div>}
      <div className="selected-campaign-creators">{value.map((creator) => {
        const source = creators.find((item) => String(item.id) === String(creator.creatorId)) || { ...creator, initials: creator.name?.slice(0, 2).toUpperCase(), color: '#dcecff', accent: '#1769aa' }
        return <div key={creator.creatorId}><Avatar creator={source} /><span><strong>{creator.name}</strong><small>@{String(creator.tiktokId).replace(/^@/, '')}</small></span><select value={creator.status} onChange={(event) => updateStatus(creator.creatorId, event.target.value)}>{CAMPAIGN_CREATOR_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select><button type="button" aria-label={`Bỏ ${creator.name}`} onClick={() => remove(creator.creatorId)}><Icon name="close" size={15} /></button></div>
      })}{!value.length && <p>Chưa chọn Creator. Bạn có thể bổ sung sau khi tạo Campaign.</p>}</div>
    </div>
  )
}
