import { lazy, Suspense, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import useBrandPortal from '../hooks/useBrandPortal'
import { publicReviewApi } from '../services/publicReviewApi'
import ClientReviewFilterBar from '../components/campaigns/ClientReviewFilterBar'
import BrandReviewDraftStatus from '../components/campaigns/BrandReviewDraftStatus'
import BrandListingTable from '../components/campaigns/BrandListingTable'
import WorkspacePagination from '../components/campaigns/WorkspacePagination'
import { cycleCreatorSort } from '../utils/creatorSorting'
import '../styles/brand-workspace.css'

const ShippingWorkspace = lazy(() => import('../components/campaigns/ShippingWorkspace'))
const BrandDeliverablesTable = lazy(() => import('../components/campaigns/BrandDeliverablesTable'))
const labels = { APPROVED: 'Đồng ý', PENDING: 'Pending', REJECTED: 'Từ chối' }
const SORTS = { tiktokId: 'ID TikTok', expense: 'Expense', segment: 'Segment', category: 'Category', type: 'Type', followers: 'Followers', gmvMonth: 'GMV / Month', createdAt: 'Thời gian thêm', clientDecision: 'Brand Pick', kocDecision: 'KOC Confirm' }
const DELIVERY_SORTS = { tiktokId: 'ID TikTok', product: 'Product', progress: 'Tiến độ', airTime: 'Air Time', codeAdsExpiry: 'Expiry Date Code Ads' }

export default function ClientReviewPage() {
  const { token } = useParams()
  return <BrandPortal token={token} key={token} />
}

function BrandPortal({ token }) {
  const portal = useBrandPortal(token)
  const { data, tab, query, draft, loadError } = portal
  const shippingApi = useMemo(() => ({ load: (query) => publicReviewApi.workspace(token, { ...query, tab: 'shipping' }), save: (updates) => publicReviewApi.saveShipments(token, updates), history: (id) => publicReviewApi.shippingHistory(token, id) }), [token])
  if (!data && (portal.loading || portal.retrying)) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>{portal.retrying ? 'Đang thử kết nối lại...' : 'Đang tải Client Review...'}</h1><p>Bạn không cần đăng nhập. Backend có thể đang khởi động, vui lòng giữ trang mở.</p></main>
  if (!data || loadError?.invalid) return <main className="client-review-page client-review-not-found"><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><h1>{loadError?.title || 'Chưa tải được Client Review'}</h1><p>{loadError?.message}</p><button type="button" onClick={portal.refresh}>Thử tải lại</button></main>
  const options = data.options || {}, filters = query.filters || {}
  const descriptors = tab === 'listing' ? [['segment', 'Segment', options.segment], ['category', 'Category', options.category], ['type', 'Type', options.type], ['brandPick', 'Brand Pick', (options.brandPick || []).map((value) => labels[value] || value)], ['kocConfirm', 'KOC Confirm', (options.kocConfirm || []).map((value) => labels[value] || value)]] : [['progress', 'Tiến độ', options.progress], ['product', 'Product', options.product], ['sdha', 'SDHA', ['Có SDHA', 'Không SDHA']], ['airStatus', 'Link Air', ['Đã có Link Air', 'Chưa có Link Air']]]
  const listingCount = Object.keys(draft.listing).length, feedbackCount = Object.keys(draft.feedback).length
  const count = tab === 'listing' ? listingCount : feedbackCount
  const rows = data.tab === tab ? data.creators : []
  const onSort = (key) => portal.changeQuery({ page: 1, sort: cycleCreatorSort(query.sort, key) })
  return <main className="client-review-page brand-workspace">
    <header className="client-review-topbar"><div><img src="/Logo/metaIcon.jpg" alt="Meta Ecom" /><span><strong>Meta Ecom</strong><small>Brand Collaboration Portal</small></span></div><em>{({ live: 'Đang đồng bộ trực tiếp', reconnecting: 'Đang kết nối lại...', connecting: 'Đang kết nối...', offline: 'Kết nối tạm gián đoạn' })[portal.liveStatus] || 'Đồng bộ theo thay đổi'}</em></header>
    <section className="client-review-hero"><p className="page-kicker">CLIENT REVIEW · {data.id}</p><h1>{data.name}</h1>{data.description && <p>{data.description}</p>}<div><span>Client / Brand <strong>{data.client}</strong></span><span>Danh sách <strong>{data.summary.total} KOC</strong></span><span>Đã chốt hai bên <strong>{data.summary.accepted} KOC</strong></span></div></section>
    <BrandReviewDraftStatus status={{ ...portal.storageStatus, count: listingCount + feedbackCount }} restored={listingCount + feedbackCount > 0} saving={portal.saving} onDiscard={portal.discardAll} />
    <nav className="client-review-tabs" aria-label="Client Review">{[['listing', 'Duyệt KOC', data.summary.total], ['shipping', 'Giao & nhận hàng', data.summary.accepted], ['deliverables', 'Duyệt nội dung', data.summary.accepted]].map(([id, name, total]) => <button type="button" disabled={portal.saving} className={tab === id ? 'is-active' : ''} onClick={() => portal.changeTab(id)} key={id}>{name}<span>{total}</span></button>)}</nav>
    {tab === 'shipping' ? <div className="brand-workspace-body"><Suspense fallback={<p>Đang tải giao/nhận hàng...</p>}><ShippingWorkspace scope={`brand:${token}`} api={shippingApi} reloadSignal={portal.reload} key={`shipping:${token}`} /></Suspense></div> : <>
      <section className="brand-workspace-body">
        <header className="brand-section-heading"><div><h2>{tab === 'listing' ? 'Duyệt danh sách KOC' : 'Duyệt nội dung & theo dõi lịch air'}</h2><p>{tab === 'listing' ? 'Chọn Brand Pick, ghi note và sản phẩm. Bấm Xem chi tiết để xem Category, Followers và GMV.' : 'Feedback được giữ trong bản nháp cho tới khi bấm gửi. Thông tin Air / Ads nằm trong Xem thêm.'}</p></div><button type="button" onClick={portal.refresh} disabled={portal.loading}>Làm mới</button></header>
        {tab === 'listing' && <div className="brand-overview-cards">{[['approved', 'Đồng ý', 'Đồng ý'], ['pending', 'Chờ duyệt', 'Pending'], ['rejected', 'Từ chối', 'Từ chối']].map(([key, label, value]) => <button type="button" key={key} onClick={() => portal.changeQuery({ page: 1, filters: { ...filters, brandPick: [value] } })}><span>{label}</span><strong>{data.summary[key]}</strong></button>)}</div>}
        {loadError && <div className="brand-conflict" role="alert">{loadError.message} Dữ liệu đang nhập vẫn được giữ.</div>}
        {portal.submission?.errors?.length > 0 && <details className="brand-submission-errors" open><summary>{portal.submission.errors.length} mục chưa lưu · các mục hợp lệ khác đã được gửi</summary>{portal.submission.errors.map((issue, i) => <p key={`${issue.creatorId}:${issue.deliverableId}:${i}`}><strong>{data.creators.find((row) => row.creatorId === issue.creatorId)?.tiktokId || issue.creatorId}: </strong>{issue.message}</p>)}</details>}
        <ClientReviewFilterBar search={query.search} filters={descriptors.map(([key, label, values]) => ({ key, label, values: filters[key] || [], options: values || [] }))} resultLabel={`${data.pagination.total} KOC phù hợp`} onSearch={(search) => portal.changeQuery({ page: 1, search })} onChange={(key, values) => portal.changeQuery({ page: 1, filters: { ...filters, [key]: values } })} onClear={() => portal.changeQuery({ page: 1, search: '', filters: {} })} />
        <div className="brand-sort-bar"><label>Thêm tiêu chí sắp xếp <select aria-label="Thêm tiêu chí sắp xếp" value="" onChange={(event) => onSort(event.target.value)}><option value="">Chọn cột...</option>{Object.entries(tab === 'listing' ? SORTS : DELIVERY_SORTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{query.sort.map((item, index) => <button type="button" key={item.key} onClick={() => onSort(item.key)} title="Bấm để đổi tăng/giảm hoặc bỏ tiêu chí">{index + 1}. {SORTS[item.key] || DELIVERY_SORTS[item.key]} {item.direction === 'asc' ? '↑' : '↓'}</button>)}{portal.loading && <span role="status">Đang cập nhật trang...</span>}</div>
        {rows.length ? tab === 'listing' ? <BrandListingTable rows={rows} drafts={draft.listing} errors={portal.submission?.errors} saving={portal.saving} onEdit={portal.editListing} onRebase={portal.rebase} options={options.productRecommendations || []} sort={query.sort} onSort={onSort} /> : <Suspense fallback={<p>Đang tải bảng nội dung...</p>}><BrandDeliverablesTable rows={rows} drafts={draft.feedback} errors={portal.submission?.errors} saving={portal.saving} onEdit={portal.editFeedback} onRebase={portal.rebase} /></Suspense> : <p className="brand-empty">{portal.loading || data.tab !== tab ? 'Đang tải dữ liệu...' : 'Không có KOC phù hợp. Duyệt nội dung dành cho KOC đã được hai bên đồng ý.'}</p>}
        <WorkspacePagination value={data.pagination} onChange={portal.changeQuery} disabled={portal.loading || portal.saving} />
      </section>
      <footer className="client-review-submit"><div><strong>{count} {tab === 'listing' ? 'KOC có thay đổi' : 'feedback'} chưa gửi</strong><small role="status">{portal.message || 'Bản nháp được giữ khi đổi trang hoặc đóng tab. Chỉ gửi phần đã chỉnh sửa.'}</small></div><button type="button" disabled={!count || portal.saving} onClick={portal.submit}>{portal.saving ? 'Đang gửi...' : tab === 'listing' ? 'Gửi phản hồi' : 'Gửi Brand Feedback'}</button></footer>
    </>}
  </main>
}
