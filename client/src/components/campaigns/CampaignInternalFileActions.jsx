import { useCallback, useRef, useState } from 'react'
import templateUrl from '../../templates/campaignInternalListingsTemplate.xlsx?url'
import { exportInternalListings, readInternalListingFile } from '../../utils/campaignInternalFiles'
import Icon from '../common/Icon'
import CampaignInternalImportModal from './CampaignInternalImportModal'
import '../../styles/campaign-internal-import.css'

export default function CampaignInternalFileActions({ campaign, creators, canEdit, canImport, disabled, onImport, onApplied, onNotify }) {
  const fileInput = useRef(null)
  const [isReading, setIsReading] = useState(false)
  const [preview, setPreview] = useState(null)
  const closePreview = useCallback(() => setPreview(null), [])
  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsReading(true)
    try {
      const rows = await readInternalListingFile(file, creators, campaign.creators || [])
      setPreview({ fileName: file.name, rows })
    } catch (error) {
      onNotify?.(error.message || 'Không thể đọc file import.')
    } finally { setIsReading(false) }
  }
  return <>
    <div className="internal-file-actions" title={disabled ? 'Hoàn tất hoặc hủy chỉnh sửa trước khi import/export' : undefined}>
      <a className="secondary-button" href={templateUrl} download="campaign-internal-listings-template.xlsx"><Icon name="download" size={15} />Tải template</a>
      {canEdit && <button type="button" className="secondary-button" title={!canImport ? 'Chỉ Admin được import vì thao tác này tạo/cập nhật kho Creator' : undefined} disabled={disabled || isReading || !canImport} onClick={() => fileInput.current?.click()}><Icon name="upload" size={15} />{isReading ? 'Đang đọc...' : 'Import'}</button>}
      <button type="button" className="secondary-button" disabled={disabled || !campaign.creators?.length} onClick={() => { exportInternalListings(campaign, creators); onNotify?.('Đã export Internal Listings ra CSV') }}><Icon name="download" size={15} />Export CSV</button>
      <input ref={fileInput} type="file" accept=".xlsx,.csv" onChange={handleFile} hidden />
    </div>
    {preview && <CampaignInternalImportModal {...preview} onClose={closePreview} onImport={onImport} onApplied={onApplied} />}
  </>
}
