import { useRef, useState } from 'react'
import templateUrl from '../../templates/creatorFormTemplate.xlsx?url'
import Icon from '../common/Icon'

export default function CreatorImportMenu({ onImport, disabled = false, disabledReason = '' }) {
  const appendInput = useRef(null)
  const replaceInput = useRef(null)
  const [isBusy, setIsBusy] = useState(false)

  const handleFile = async (event, mode) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setIsBusy(true)
    try {
      await onImport(file, mode)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className={`creator-import-menu${disabled ? ' is-disabled' : ''}`} title={disabled ? disabledReason : undefined}>
      <button className="secondary-button import-trigger" disabled={isBusy || disabled}><Icon name="upload" />{isBusy ? 'Đang đọc file...' : 'Import'}</button>
      {!disabled && <div className="import-menu-popover">
        <a href={templateUrl} download="creatorFormTemplate.xlsx"><span className="import-option-icon"><Icon name="download" size={17} /></span><span><strong>Tải template form</strong><small>File Excel đúng cấu trúc để nhập dữ liệu</small></span></a>
        <button onClick={() => appendInput.current?.click()}><span className="import-option-icon is-add"><Icon name="plus" size={17} /></span><span><strong>Thêm vào danh sách</strong><small>Bỏ qua TikTok ID đã tồn tại</small></span></button>
        <button onClick={() => replaceInput.current?.click()}><span className="import-option-icon is-replace"><Icon name="replace" size={17} /></span><span><strong>Thay thế hoàn toàn</strong><small>Dùng file mới thay toàn bộ kho Creator</small></span></button>
      </div>}
      <input ref={appendInput} type="file" accept=".xlsx,.csv" onChange={(event) => handleFile(event, 'append')} hidden />
      <input ref={replaceInput} type="file" accept=".xlsx,.csv" onChange={(event) => handleFile(event, 'replace')} hidden />
    </div>
  )
}
