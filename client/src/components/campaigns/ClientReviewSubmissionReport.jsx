import Icon from '../common/Icon'

export default function ClientReviewSubmissionReport({ result, campaign }) {
  if (!result?.errors?.length) return null
  const creators = new Map((campaign.creators || []).map((creator) => [String(creator.creatorId), creator]))
  return (
    <section className="client-review-submission-report" role="status" aria-live="polite">
      <div><Icon name="warning" size={20} /><div><strong>Đã lưu {result.savedCount} mục · {result.errors.length} mục chưa lưu</strong><p>{result.interrupted ? 'Quá trình gửi bị gián đoạn. Các mục đã lưu vẫn được giữ.' : 'Đã bỏ qua các mục lỗi và lưu những mục còn lại.'} Nội dung chưa lưu được giữ lại để sửa và gửi lại.</p></div></div>
      <details open><summary>Chi tiết lỗi của lần gửi gần nhất ({result.errors.length})</summary><ul>{result.errors.map((issue, index) => {
        const creator = creators.get(String(issue.creatorId))
        const label = creator?.tiktokId ? `@${String(creator.tiktokId).replace(/^@/, '')}` : issue.creatorId ? `KOC ${issue.creatorId}` : `Dòng ${issue.row || index + 1}`
        return <li key={`${issue.creatorId}-${issue.deliverableId}-${index}`}><strong>{label}{issue.deliverableId ? ` · Deliverable ${issue.deliverableId}` : ''}</strong><span>{issue.message}</span></li>
      })}</ul></details>
    </section>
  )
}
