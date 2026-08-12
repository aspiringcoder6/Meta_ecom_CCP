import { useCallback, useEffect, useRef } from 'react'
import { CREATOR_TOUR_EVENT, CREATOR_TOUR_PENDING_KEY } from '../utils/creatorTour'

function step(element, title, description, side = 'bottom', align = 'center', extra = {}) {
  return { element, popover: { title, description, side, align }, ...extra }
}

function waitForTourElement(selector, timeout = 6000) {
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
    const timer = window.setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
    observer.observe(document.body, { childList: true, subtree: true })
  })
}

export function useCreatorTour({ canManage, closeFullscreen }) {
  const driverRef = useRef(null)
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const transitioningRef = useRef(false)

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
    const transitionOnNext = (triggerSelector, targetSelector) => async (_element, _step, { driver: activeDriver }) => {
      if (transitioningRef.current) return
      const trigger = document.querySelector(triggerSelector)
      if (!(trigger instanceof HTMLElement)) {
        activeDriver.moveNext()
        return
      }

      transitioningRef.current = true
      trigger.click()
      const target = await waitForTourElement(targetSelector)
      transitioningRef.current = false
      if (!target || driverRef.current !== activeDriver) return
      window.requestAnimationFrame(() => activeDriver.moveNext())
    }

    const pageSteps = [
      step('[data-tour="creators-heading"]', 'Bắt đầu với kho Creator', 'Guide sẽ hướng dẫn bạn cách xem insight, import, lọc và thao tác với bảng; sau đó chuyển sang workspace toàn màn hình để dễ thao tác. Nhấn Esc hoặc nút × để thoát bất kỳ lúc nào.', 'bottom', 'start'),
      step('[data-tour="creator-insights"]', 'Insight tổng quan và chi tiết', 'Phần thu gọn cho biết tổng Creator, Category lớn nhất, Booking Expense và Creator dẫn đầu. Chọn “Xem chi tiết” để mở phân bổ Category theo Segment cùng bảng xếp hạng.'),
      step('[data-tour="page-export"]', 'Export dữ liệu từ hệ thống', 'Định dạng file tải xuống sẽ là file csv, giữ nguyên định dạng như bạn nhìn thấy trên bảng', 'bottom', 'end'),
      ...(canManage ? [
        step('[data-tour="page-import"]', 'Import và đối chiếu Creator', 'Di chuột vào để hiện menu tải template, thêm/cập nhật hoặc thay thế dữ liệu. TikTok ID trùng sẽ được cập nhật và gộp thêm Category, Type; preview cho biết số dòng mới, cập nhật và lỗi trước khi bạn chấp nhận.'),
        step('[data-tour="page-add"]', 'Thêm Creator thủ công', 'Form đầy đủ nhất để nhập dữ liệu. Category có thể đặt tự do như “abc > cde”; Cost và Extra/FOC tự tính Total Cast cùng Booking Expense.'),
      ] : []),
      step('[data-tour="page-search"]', 'Tìm nhanh trong kho', 'Tìm theo tên, TikTok ID, Link hoặc Category. Kết quả ở các trang sẽ cập nhật khi bạn thay đổi search', 'bottom', 'start'),
      step('[data-tour="page-filters"]', 'Bộ lọc nhiều lựa chọn', 'Có thể chọn đồng thời nhiều Segment, Category và Type. Trong Category tree, hover để mở các subcategory, chọn cấp cha sẽ bao gồm toàn bộ các nhánh con.'),
      step('[data-tour="page-category-layers"]', 'Chọn độ sâu Category', 'Layer 1 chỉ hiện Category gốc; Layer 2 thêm L2; Layer 3 hiển thị tối đa ba cấp', 'bottom'),
      step('[data-tour="page-numeric-filter"]', 'Bộ lọc số linh hoạt', 'Thêm điều kiện min, max hoặc range cho Followers, GMV, Cost, Booking Expense và các trường số khác.', 'top', 'start'),
      step('[data-tour="page-sort-header"]', 'Sorting nhiều tiêu chí', 'Bấm một header để sort tăng dần, bấm lần nữa để giảm dần và lần ba để bỏ. Chọn thêm header khác để tạo thứ tự ưu tiên nhiều tiêu chí.', 'bottom', 'start'),
      step('[data-tour="page-pagination"]', 'Điều hướng danh sách', 'Chọn số hàng trên mỗi trang, chuyển bằng các nút trang hoặc nhập thẳng số trang muốn đến.', 'top'),
      step('[data-tour="page-fullscreen"]', 'Chuyển sang fullscreen', 'Chọn “Mở fullscreen”. Khi bạn vào fullscreen, sẽ tiếp tục guide ở chế độ toàn màn hình.', 'left', 'center', {
        disableActiveInteraction: true,
        popover: {
          title: 'Chuyển sang fullscreen',
          description: 'Chọn “Mở fullscreen”. Khi bạn vào fullscreen, sẽ tiếp tục guide ở chế độ toàn màn hình.',
          side: 'left',
          align: 'center',
          showButtons: ['next', 'close'],
          nextBtnText: 'Mở fullscreen',
          onNextClick: transitionOnNext('[data-tour="page-fullscreen"]', '[data-tour="fullscreen-header"]'),
        },
      }),
    ]

    const fullscreenSteps = [
      step('[data-tour="fullscreen-header"]', 'Workspace toàn màn hình', 'Bảng là vùng làm việc chính. Thanh đầu giữ Export, Import, thêm Creator, chuyển chế độ chỉnh sửa và nút thoát fullscreen.', 'bottom', 'start', { waitForElement: 5000 }),
      ...(canManage ? [step('[data-tour="fullscreen-import"]', 'Import ngay trong fullscreen', 'Bạn có thể bắt đầu một lần import mới tại đây. Hệ thống sẽ mở preview, tô xanh lá dòng mới, xanh dương dòng cập nhật và liệt kê lỗi màu đỏ.', 'bottom', 'end', { skipMissingElement: true })] : []),
      step('[data-tour="fullscreen-toolbar"]', 'Search và filter luôn sẵn sàng', 'Các lựa chọn Search, multi-filter và Layer được giữ đồng bộ với trang thường, thao tác tương tự', 'bottom'),
      step('[data-tour="fullscreen-category-layers"]', 'Layer trong fullscreen', 'Chọn Layer 1, 2 hoặc 3 để chọn số lớp tối đa hiển thị', 'bottom'),
      step('[data-tour="header-height-resizer"]', 'Điều chỉnh chiều cao thanh đầu', 'Kéo thanh phân cách này để dành thêm hoặc bớt không gian cho nhóm nút thao tác.', 'bottom'),
      step('[data-tour="workspace-height-resizer"]', 'Điều chỉnh chiều cao bộ lọc', 'Kéo để thay đổi chiều cao vùng Search và filter. Phần bảng sẽ tự nhận toàn bộ không gian còn lại.', 'bottom'),
      step('[data-tour="fullscreen-sort-header"]', 'Sorting trong bảng lớn', 'Bấm nhiều header để sort theo nhiều tiêu chí. Badge 1 là ưu tiên cao nhất, sau đó là 2, 3…', 'bottom', 'start'),
      step('[data-tour="column-resizer"]', 'Thay đổi độ rộng cột', 'Kéo mép phải của header để resize cột. Double-click vào mép kéo để khôi phục kích thước mặc định.', 'right'),
      step('[data-tour="fullscreen-pagination"]', 'Pagination và số hàng', 'Chọn 10, 25, 50 hoặc 100 hàng mỗi trang, dùng số trang hoặc nhập trang đích. Pagination tự cập nhật sau khi Search và filter.', 'top'),
      step('[data-tour="row-density"]', 'Mật độ hiển thị hàng', 'Dùng − và + để thay đổi chiều cao từng hàng mà không đổi số hàng trên trang. Bấm số px ở giữa để trở về mật độ mặc định.', 'top'),
      ...(canManage ? [
        step('[data-tour="edit-toggle"]', 'Chế độ chỉnh sửa spreadsheet', 'Chọn “Bắt đầu chỉnh sửa”. Guide sẽ chờ spreadsheet mode sẵn sàng trước khi hướng dẫn các ô dữ liệu.', 'bottom', 'end', {
          disableActiveInteraction: true,
          popover: {
            title: 'Chế độ chỉnh sửa spreadsheet',
            description: 'Chọn “Bắt đầu chỉnh sửa”. Bạn có thể thêm nhanh, sửa hoặc xóa dòng; mọi thay đổi thử trong guide sẽ được hủy khi thoát.',
            side: 'bottom',
            align: 'end',
            showButtons: ['next', 'close'],
            nextBtnText: 'Bắt đầu chỉnh sửa',
            onNextClick: transitionOnNext('[data-tour="edit-toggle"]', '[data-tour="edit-history"]'),
          },
        }),
        step('[data-tour="spreadsheet-cell"]', 'Chỉnh sửa trực tiếp trong ô', 'Bấm ô để sửa; Enter hoặc click ra ngoài để ghi nhận, Esc để hủy nội dung đang nhập. Ô không hợp lệ được tô đỏ và hiển thị lý do.', 'right', 'start', { waitForElement: 5000, skipMissingElement: true, disableActiveInteraction: false }),
        step('[data-tour="edit-history"]', 'Undo, Redo và hủy phiên sửa', 'Dùng các nút hoặc Ctrl+Z / Ctrl+Y để hoàn tác và làm lại. “Hủy thay đổi” khôi phục toàn bộ dữ liệu trước khi vào chế độ chỉnh sửa.', 'bottom', 'end', { waitForElement: 5000, skipMissingElement: true }),
      ] : []),
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
        transitioningRef.current = false
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
