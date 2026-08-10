import { useCallback, useEffect, useRef } from 'react'
import { CREATOR_TOUR_EVENT, CREATOR_TOUR_PENDING_KEY } from '../utils/creatorTour'

function step(element, title, description, side = 'bottom', align = 'center', extra = {}) {
  return { element, popover: { title, description, side, align }, ...extra }
}

export function useCreatorTour({ canManage, closeFullscreen }) {
  const driverRef = useRef(null)
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)

  const leaveTourState = useCallback(() => {
    const cancelEdit = document.querySelector('[data-tour="cancel-edit"]')
    if (cancelEdit instanceof HTMLElement) cancelEdit.click()
    if (mountedRef.current) closeFullscreen()
  }, [closeFullscreen])

  const startTour = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    driverRef.current?.destroy()

    const { driver } = await import('driver.js')
    if (!mountedRef.current) {
      loadingRef.current = false
      return
    }

    let tour
    const pageSteps = [
      step('[data-tour="creators-heading"]', 'Chào mừng đến Creator Management', 'Guide này giới thiệu các thao tác chính, sau đó đưa bạn vào fullscreen để làm việc với bảng. Bạn có thể nhấn Esc hoặc nút × để thoát bất kỳ lúc nào.', 'bottom', 'start'),
      step('[data-tour="creator-insights"]', 'Creator Insights', 'Xem nhanh tổng Creator, Category lớn nhất, Booking Expense và Creator dẫn đầu. Nút “Xem chi tiết” mở phân bổ sâu theo Category và Segment.'),
      step('[data-tour="page-export"]', 'Export dữ liệu', 'Tải danh sách Creator đang hiển thị thành file CSV. Search, filter và sorting hiện tại sẽ quyết định thứ tự dữ liệu export.', 'bottom', 'end'),
      ...(canManage ? [
        step('[data-tour="page-import"]', 'Import Creator', 'Hover để tải template, thêm dữ liệu vào kho hoặc thay thế hoàn toàn. Import luôn có preview và có thể hủy trước khi lưu.'),
        step('[data-tour="page-add"]', 'Thêm Creator', 'Mở form đầy đủ để tạo một Creator. Cost và Extra/FOC sẽ tự động tính Total Cast và Booking Expense.'),
      ] : []),
      step('[data-tour="page-toolbar"]', 'Search và bộ lọc', 'Tìm theo tên, TikTok ID hoặc Category; kết hợp Segment, Category và Type để thu hẹp danh sách.'),
      step('[data-tour="page-numeric-filter"]', 'Bộ lọc số linh hoạt', 'Thêm điều kiện min, max hoặc range cho Followers, GMV, Cost, Booking Expense và các trường số khác.', 'top', 'start'),
      step('[data-tour="page-fullscreen"]', 'Chuyển sang fullscreen', 'Hãy bấm trực tiếp nút này để tiếp tục guide trong workspace toàn màn hình.', 'left', 'center', {
        advanceOnClick: true,
        disableActiveInteraction: false,
        popover: { title: 'Chuyển sang fullscreen', description: 'Hãy bấm trực tiếp nút này để tiếp tục guide trong workspace toàn màn hình.', side: 'left', align: 'center', showButtons: ['close'] },
      }),
    ]

    const fullscreenSteps = [
      step('[data-tour="fullscreen-header"]', 'Fullscreen workspace', 'Bảng Creator trở thành vùng làm việc chính. Các nút Export, Import, thêm mới và chỉnh sửa luôn nằm trên thanh đầu.', 'bottom', 'start', { waitForElement: 5000 }),
      step('[data-tour="fullscreen-toolbar"]', 'Filter vẫn luôn sẵn sàng', 'Search và toàn bộ filter được giữ trong fullscreen. Bạn có thể kéo thanh phân cách bên dưới để tăng hoặc giảm chiều cao khu vực này.'),
      step('[data-tour="workspace-height-resizer"]', 'Điều chỉnh bố cục', 'Kéo thanh ngang để thay đổi chiều cao toolbar. Thanh tương tự dưới header điều chỉnh chiều cao khu vực thao tác.', 'bottom'),
      step('[data-tour="sort-header"]', 'Multi-column sorting', 'Bấm header để chuyển lần lượt: ascending, descending và bỏ sorting. Badge số thể hiện độ ưu tiên; tiêu chí chọn trước có ưu tiên cao hơn.', 'bottom', 'start'),
      step('[data-tour="column-resizer"]', 'Thay đổi độ rộng cột', 'Kéo mép phải của header để resize cột. Double-click vào mép kéo để khôi phục kích thước mặc định.', 'right'),
      ...(canManage ? [
        step('[data-tour="edit-toggle"]', 'Chế độ chỉnh sửa spreadsheet', 'Hãy bấm trực tiếp “Chỉnh sửa” để mở spreadsheet mode. Các thay đổi trong guide sẽ được hủy khi bạn thoát.', 'bottom', 'end', {
          advanceOnClick: true,
          disableActiveInteraction: false,
          popover: { title: 'Chế độ chỉnh sửa spreadsheet', description: 'Hãy bấm trực tiếp “Chỉnh sửa” để mở spreadsheet mode. Các thay đổi trong guide sẽ được hủy khi bạn thoát.', side: 'bottom', align: 'end', showButtons: ['close'] },
        }),
        step('[data-tour="spreadsheet-cell"]', 'Chỉnh sửa trực tiếp trong ô', 'Bạn có thể thử sửa ô này. Enter hoặc blur để lưu nội dung; Esc hủy nội dung đang nhập. Giá trị không hợp lệ sẽ được tô đỏ và hiện lý do. Mọi thay đổi thử sẽ bị hủy khi guide kết thúc.', 'right', 'start', { waitForElement: 5000, skipMissingElement: true, disableActiveInteraction: false }),
        step('[data-tour="edit-history"]', 'Undo và Redo', 'Hoàn tác bằng các nút này hoặc Ctrl+Z / Ctrl+Y. “Hủy thay đổi” khôi phục toàn bộ trạng thái trước phiên chỉnh sửa.', 'bottom', 'end', { waitForElement: 5000, skipMissingElement: true }),
      ] : []),
      step('[data-tour="row-density"]', 'Mật độ hiển thị hàng', 'Dùng − và + để thay đổi chiều cao hàng, từ đó chọn xem nhiều Creator hơn hoặc đọc thông tin thoáng hơn.', 'top'),
      step('[data-tour="fullscreen-close"]', 'Bạn đã sẵn sàng', 'Nút này thoát fullscreen. Guide cũng có thể được đóng bất kỳ lúc nào bằng Esc; mọi thay đổi thử trong spreadsheet của guide sẽ được hủy.', 'left', 'end'),
    ]

    tour = driver({
      steps: [...pageSteps, ...fullscreenSteps],
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
      popoverClass: 'meta-creator-tour',
      onDestroyed: () => {
        driverRef.current = null
        leaveTourState()
      },
    })
    driverRef.current = tour
    loadingRef.current = false
    tour.drive()
  }, [canManage, leaveTourState])

  useEffect(() => {
    const handleStart = () => window.setTimeout(startTour, 120)
    window.addEventListener(CREATOR_TOUR_EVENT, handleStart)
    let timer
    if (window.sessionStorage.getItem(CREATOR_TOUR_PENDING_KEY)) {
      window.sessionStorage.removeItem(CREATOR_TOUR_PENDING_KEY)
      timer = window.setTimeout(startTour, 450)
    }
    return () => {
      window.removeEventListener(CREATOR_TOUR_EVENT, handleStart)
      window.clearTimeout(timer)
    }
  }, [startTour])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      driverRef.current?.destroy()
    }
  }, [])
}
