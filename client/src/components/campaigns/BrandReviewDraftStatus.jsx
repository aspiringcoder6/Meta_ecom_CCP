import Icon from '../common/Icon'

export default function BrandReviewDraftStatus({ status, restored, saving, onDiscard }) {
  const label = !status.ok ? 'Không thể lưu bản nháp trên trình duyệt' : status.count
    ? `${restored ? 'Đã khôi phục bản nháp · ' : ''}${status.count} mục chưa gửi được lưu trên trình duyệt này`
    : 'Bản nháp được lưu tự động trên trình duyệt này'
  return <section className={`client-review-draft-status ${!status.ok ? 'has-error' : ''}`} aria-live="polite"><Icon name={status.ok ? 'check' : 'warning'} size={17} /><div><strong>{label}</strong><p>{status.ok ? 'Đóng tab và mở lại cùng link trên cùng trình duyệt để tiếp tục. Nháp chưa được gửi đến team cho đến khi bấm Gửi phản hồi.' : 'Trình duyệt có thể chặn local storage hoặc đã hết dung lượng. Hãy giữ tab mở và gửi phản hồi trước khi đóng.'}</p></div>{status.count > 0 && <button type="button" disabled={saving} onClick={onDiscard}>Xóa bản nháp</button>}</section>
}
