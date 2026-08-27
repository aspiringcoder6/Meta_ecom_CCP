import { useCallback, useEffect, useRef } from 'react'
import { CAMPAIGN_TOUR_EVENT } from '../utils/campaignTour'

function step(element, title, description, side = 'bottom', align = 'center', extra = {}) {
  return { element, popover: { title, description, side, align }, ...extra }
}

function waitForElement(selector, timeout = 6000) {
  const existing = document.querySelector(selector)
  if (existing) return Promise.resolve(existing)
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (!element) return
      window.clearTimeout(timer)
      observer.disconnect()
      resolve(element)
    })
    const timer = window.setTimeout(() => { observer.disconnect(); resolve(null) }, timeout)
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

export function useCampaignTour({ mode, canManage = false, activeTab = 'overview', openTab }) {
  const driverRef = useRef(null)
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const originalTabRef = useRef('overview')

  const startTour = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    driverRef.current?.destroy()
    originalTabRef.current = activeTab

    if (mode === 'detail' && activeTab !== 'overview') {
      openTab?.('overview')
      await waitForElement('[data-tour="campaign-overview-metrics"]')
    }

    const { driver } = await import('driver.js')
    if (!mountedRef.current) { loadingRef.current = false; return }

    const transitionToTab = (tab, targetSelector) => async (_element, _currentStep, { driver: activeDriver }) => {
      openTab?.(tab)
      const target = await waitForElement(targetSelector)
      if (!target || driverRef.current !== activeDriver) return
      window.requestAnimationFrame(() => activeDriver.moveNext())
    }

    const tabStep = (tab, label, description, targetSelector) => step(`[data-tour="campaign-tab-${tab}"]`, `Mở ${label}`, description, 'bottom', 'center', {
      popover: {
        title: `Mở ${label}`,
        description,
        side: 'bottom',
        align: 'center',
        showButtons: ['next', 'close'],
        nextBtnText: `Mở ${label}`,
        onNextClick: transitionToTab(tab, targetSelector),
      },
    })

    const listSteps = [
      step('[data-tour="campaigns-heading"]', 'Campaign Management', 'Theo dõi toàn bộ Campaign, trạng thái, owner, timeline và ngân sách. Bạn có thể nhấn Esc hoặc × để thoát guide bất kỳ lúc nào.', 'bottom', 'start'),
      step('[data-tour="campaigns-metrics"]', 'Chỉ số tổng quan', 'Xem nhanh tổng Campaign, số đang chạy, số Draft và tổng ngân sách của các Campaign chưa huỷ.'),
      step('[data-tour="campaigns-filters"]', 'Tìm kiếm và lọc trạng thái', 'Tìm theo ID, tên Campaign, Client hoặc Owner; kết hợp bộ lọc Draft, Đang chạy, Tạm dừng, Hoàn thành và Đã huỷ.', 'bottom', 'end'),
      step('[data-tour="campaigns-list"]', 'Danh sách Campaign', 'Bấm một dòng để mở workspace riêng của Campaign, nơi quản lý listing, timeline, deliverables và Financial Listings.', 'top'),
      ...(canManage ? [step('[data-tour="campaign-create-button"]', 'Tạo Campaign mới', 'Admin và Campaign Manager có thể tạo Campaign. Campaign mới luôn bắt đầu ở trạng thái Draft để kiểm tra trước khi chạy.', 'left', 'center')] : []),
    ]

    const createSteps = [
      step('[data-tour="campaign-create-heading"]', 'Tạo Campaign mới', 'Form này tạo Campaign ở trạng thái Draft. Các phần bắt buộc sẽ hiển thị lỗi ngay bên dưới nếu dữ liệu chưa hợp lệ.', 'bottom', 'start'),
      step('[data-tour="campaign-create-general"]', 'Thông tin chung và mục tiêu', 'Nhập tên Campaign, Client/Brand, Owner, Category và mục tiêu số Creator cho từng Segment.'),
      step('[data-tour="campaign-create-timeline"]', 'Thời gian và milestone', 'Chọn ngày bắt đầu, kết thúc và thêm các mốc như chốt Creator, gửi brief, duyệt kịch bản, đăng bài hoặc nghiệm thu.'),
      step('[data-tour="campaign-create-budget"]', 'Ngân sách Campaign', 'Tổng ngân sách là bắt buộc. Ngân sách theo Creator là tuỳ chọn và có thể điều chỉnh sau.'),
      step('[data-tour="campaign-create-creators"]', 'Chọn Creator ban đầu', 'Bạn có thể chọn Creator ngay khi tạo hoặc để trống và bổ sung sau trong Internal Listings.'),
      step('[data-tour="campaign-create-deliverables"]', 'Deliverable mặc định', 'Thiết lập yêu cầu nội dung mặc định. Sau này mỗi Creator có thể có nhiều deliverable riêng.'),
      step('[data-tour="campaign-create-summary"]', 'Kiểm tra trước khi tạo', 'Thẻ bên phải cho biết mức độ hoàn thiện và trạng thái Draft. Bấm “Tạo Campaign” khi các trường bắt buộc đã sẵn sàng.', 'left', 'start'),
    ]

    const detailSteps = [
      step('[data-tour="campaign-detail-heading"]', 'Workspace của Campaign', 'Đây là khu vực làm việc riêng cho Campaign hiện tại. Guide sẽ đi lần lượt qua workflow từ Internal Listings đến Financial Listings.', 'bottom', 'start'),
      step('[data-tour="campaign-status-control"]', 'Cập nhật trạng thái Campaign', canManage ? 'Chuyển giữa Draft, Đang chạy, Tạm dừng, Hoàn thành và Đã huỷ. Thay đổi được lưu trực tiếp vào hệ thống.' : 'Bạn có thể xem trạng thái hiện tại; chỉ Admin và Campaign Manager được phép thay đổi.', 'left'),
      step('[data-tour="campaign-tabs"]', 'Các phần của Campaign', 'Dùng các tab để quản lý listing, quá trình thực thi, tài chính và thông tin Campaign. Timeline hiện nằm trong Tổng quan.'),
      step('[data-tour="campaign-overview-deliverables"]', 'Ưu tiên tiến độ Deliverables', 'Khối lớn đầu trang tổng hợp Done, đang xử lý, Cancel và Performance theo GMV.'),
      step('[data-tour="campaign-overview-metrics"]', 'Overview theo workflow mới', 'Bốn chỉ số lần lượt phản ánh Internal Listings, Brand Approved, Deliverables Done và Financial Listings.'),
      step('[data-tour="campaign-segment-goals"]', 'Mục tiêu theo Segment', 'Theo dõi số Creator hiện có so với mục tiêu MINI, TOP, MASSIVE và FREECAST đã thiết lập.'),
      step('[data-tour="campaign-overview-workflow"]', 'Luồng KOC trực quan', 'Mỗi thẻ là một bước của workflow. Bạn cũng có thể bấm trực tiếp vào thẻ để mở tab tương ứng.'),
      step('[data-tour="campaign-timeline-workspace"]', 'Timeline trong Tổng quan', canManage ? 'Timeline được gộp vào đây. Bấm “Chỉnh sửa Timeline” để thêm milestone, deadline, owner và trạng thái.' : 'Timeline hiển thị milestone, deadline và người phụ trách ngay trong Tổng quan.'),
      tabStep('internal-listings', 'Internal Listings', 'Mở bảng nội bộ để chọn Creator và chuẩn bị giá trước khi gửi Client.', '[data-tour="campaign-internal-workspace"]'),
      step('[data-tour="campaign-internal-workspace"]', 'Internal Listings', 'Hai cột TikTok được giữ cố định. Cost, Extra/FOC, Cast, Expense và AGI dùng dữ liệu Campaign nhưng vẫn đồng bộ với kho Creator.'),
      ...(canManage ? [step('[data-tour="campaign-internal-actions"]', 'Chỉnh sửa và thêm Creator', '“Chỉnh sửa” mở spreadsheet cho các cột được phép điền. “Thêm nhanh” tạo dòng mới đồng bộ vào kho; “Thêm Creator” mở bộ chọn có filter và sorting.', 'bottom', 'end')] : []),
      step('[data-tour="campaign-internal-table"]', 'Bảng nội bộ có cuộn ngang', 'Cuộn ngang bên trong bảng để xem toàn bộ trường. Link TikTok và ID TikTok vẫn sticky để không mất ngữ cảnh.', 'top', 'start'),
      tabStep('external-listings', 'External Listings', 'Dữ liệu Internal được đồng bộ sang bảng Brand Pick và KOC Confirm.', '[data-tour="campaign-external-workspace"]'),
      step('[data-tour="campaign-review-link"]', 'Link Brand Review', 'Sao chép link riêng để Brand duyệt KOC và để lại Brand Note. Thay đổi của Client sẽ đồng bộ và được highlight.'),
      step('[data-tour="campaign-external-workspace"]', 'External Listings', 'Bảng này là nguồn dữ liệu của KOC Listing trên trang Client Review. KOC chỉ sang Deliverables khi Brand Pick và KOC Confirm đều Approved.'),
      tabStep('deliverables', 'Deliverables', 'Theo dõi từng deliverable của các KOC đã accepted.', '[data-tour="campaign-deliverables-workspace"]'),
      step('[data-tour="campaign-deliverables-workspace"]', 'Execution Tracking', 'Xem overview, export sheet và quản lý nhiều deliverable cho mỗi Creator, gồm Performance theo GMV, tiến độ, SDHA, Product, lịch air và Code Ads.'),
      step('[data-tour="campaign-deliverables-filters"]', 'Lọc Deliverables linh hoạt', 'Tìm kiếm toàn bảng; chọn nhiều Segment, Type, Tiến độ, Product hoặc SDHA; và kết hợp các khoảng số như Expense, GMV, Followers, Quantity hay Performance.'),
      step('[data-tour="campaign-deliverables-table"]', 'Bảng Deliverables rộng', 'Cuộn ngang chỉ bên trong bảng; Link TikTok và ID TikTok được giữ cố định. Creator chỉ trở thành Final khi tất cả deliverable đều Done.', 'top', 'start'),
      tabStep('financial-listings', 'Financial Listings', 'Mở bảng tài chính của các KOC đã hoàn thành đầy đủ điều kiện.', '[data-tour="campaign-final-workspace"]'),
      step('[data-tour="campaign-final-workspace"]', 'Financial Listings', 'Theo dõi Cost, Extra, Cast, AGI, Expense, tổng ngân sách có agency fee 6%, cùng Tracking và Note thanh toán nhập tay.', 'top'),
      tabStep('information', 'Thông tin', 'Xem và chỉnh sửa thông tin, Category, mục tiêu Segment, thời gian và ngân sách Campaign.', '.campaign-settings-card'),
      step('.campaign-settings-card', 'Thông tin Campaign', canManage ? 'Đây là nơi cập nhật thông tin chung và mục tiêu theo Segment sau khi Campaign đã được tạo. Bạn đã hoàn tất Campaign guide.' : 'Đây là nơi xem toàn bộ thông tin cấu hình của Campaign. Bạn đã hoàn tất Campaign guide.', 'top'),
    ]

    const tour = driver({
      steps: mode === 'list' ? listSteps : mode === 'create' ? createSteps : detailSteps,
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn tất',
      showButtons: ['next', 'close'],
      allowClose: true,
      allowKeyboardControl: true,
      disableActiveInteraction: true,
      overlayClickBehavior: 'close',
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      popoverOffset: 14,
      smoothScroll: true,
      popoverClass: 'meta-creator-tour meta-campaign-tour',
      onDestroyed: () => {
        driverRef.current = null
        if (mode === 'detail' && mountedRef.current) openTab?.(originalTabRef.current)
      },
    })
    driverRef.current = tour
    loadingRef.current = false
    tour.drive()
  }, [activeTab, canManage, mode, openTab])

  useEffect(() => {
    const handleStart = () => window.setTimeout(startTour, 100)
    window.addEventListener(CAMPAIGN_TOUR_EVENT, handleStart)
    return () => window.removeEventListener(CAMPAIGN_TOUR_EVENT, handleStart)
  }, [startTour])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; driverRef.current?.destroy() }
  }, [])
}
