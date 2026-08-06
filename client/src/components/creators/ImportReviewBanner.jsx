import { useState } from 'react'
import Icon from '../common/Icon'

export default function ImportReviewBanner({ review }) {
  const [showPreview, setShowPreview] = useState(true)
  const [showErrors, setShowErrors] = useState(true)

  return (
    <div className="import-review-banner">
      <div className={`import-review-summary ${showPreview ? '' : 'is-collapsed'}`}>
        <span className="import-review-icon"><Icon name="fileSpreadsheet" /></span>
        <div><strong>Xem preview: {review.fileName}</strong>{showPreview && <p>{review.mode === 'append' ? `Sẽ thêm ${review.importedCount} Creator vào danh sách hiện tại.` : `Sẽ thay toàn bộ danh sách bằng ${review.importedCount} Creator từ file.`}</p>}</div>
        <div className="import-review-actions">
          {showPreview && <div className="import-review-stats"><span><strong>{review.importedCount}</strong> hợp lệ</span><span className={review.duplicateCount ? 'has-warning' : ''}><strong>{review.duplicateCount}</strong> trùng lặp</span><span className={review.errorCount ? 'has-error' : ''}><strong>{review.errorCount}</strong> lỗi</span></div>}
          <button className="section-visibility-toggle" onClick={() => setShowPreview((visible) => !visible)} aria-expanded={showPreview}><Icon name="chevronDown" size={14} />{showPreview ? 'Ẩn preview' : 'Hiện preview'}</button>
        </div>
      </div>
      {review.errors.length > 0 && (
        <section className="import-error-panel">
          <div className="import-error-heading"><Icon name="warning" size={16} /><strong>{review.errors.length} dòng không được import</strong>{showErrors && <span>— xem nguyên nhân bên dưới</span>}<button className="section-visibility-toggle is-error" onClick={() => setShowErrors((visible) => !visible)} aria-expanded={showErrors}><Icon name="chevronDown" size={14} />{showErrors ? 'Ẩn lỗi' : 'Hiện lỗi'}</button></div>
          {showErrors && <div className="import-error-table" role="table" aria-label="Các dòng import bị lỗi">
            <div className="import-error-header" role="row"><span role="columnheader">Dòng</span><span role="columnheader">TikTok ID / Link</span><span role="columnheader">Lý do lỗi</span></div>
            {review.errors.map((error, index) => (
              <div className="import-error-row" role="row" key={`${error.row}-${index}`}>
                <strong role="cell">{error.row}</strong>
                <span role="cell" title={error.identifier}>{error.identifier}</span>
                <span role="cell">{error.messages.join(' · ')}</span>
              </div>
            ))}
          </div>}
        </section>
      )}
    </div>
  )
}
