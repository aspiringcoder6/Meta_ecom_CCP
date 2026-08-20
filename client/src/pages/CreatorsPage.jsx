import { useCallback, useEffect, useMemo, useState } from 'react'
import AddCreatorModal from '../components/creators/AddCreatorModal'
import CreatorDetailsDrawer from '../components/creators/CreatorDetailsDrawer'
import CreatorSummary from '../components/creators/CreatorSummary'
import CreatorWorkspace from '../components/creators/CreatorWorkspace'
import CreatorImportMenu from '../components/creators/CreatorImportMenu'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { useAuth } from '../hooks/useAuth'
import { useCreatorTour } from '../hooks/useCreatorTour'
import { DEFAULT_CREATOR_FILTERS, matchesCreatorFilters } from '../utils/creatorFilters'
import { exportCreatorsToCsv } from '../utils/exportCreators'
import { parseCreatorImportFile } from '../utils/creatorImport'
import { cycleCreatorSort, sortCreators } from '../utils/creatorSorting'
import { toCreatorList } from '../utils/creatorLists'

export default function CreatorsPage() {
  const { user, canManageCreators } = useAuth()
  const { creators, campaigns, recentlyAddedCreatorId, assignCreatorToCampaign, addCreator, saveCreatorDetails, addQuickCreator, applyCreatorImport, updateCreator, deleteCreator, toggleArchive, undoCreators, redoCreators, canUndo, canRedo, beginCreatorEditSession, commitCreatorEditSession, cancelCreatorEditSession, showToast } = useApp()
  const canAssignCampaign = ['ADMIN', 'CAMPAIGN_MANAGER'].includes(user?.role)
  const [filters, setFilters] = useState(DEFAULT_CREATOR_FILTERS)
  const [numericFilters, setNumericFilters] = useState([])
  const [selectedCreatorId, setSelectedCreatorId] = useState(null)
  const [editingCreatorId, setEditingCreatorId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [importReview, setImportReview] = useState(null)
  const [sortCriteria, setSortCriteria] = useState([])
  const [categoryDisplayLevel, setCategoryDisplayLevel] = useState(1)
  const closeFullscreenForTour = useCallback(() => setIsFullscreen(false), [])
  useCreatorTour({ canManage: canManageCreators, closeFullscreen: closeFullscreenForTour })

  const filterOptions = useMemo(() => ({
    segments: [...new Set(creators.map((creator) => creator.segment))],
    categories: [...new Set(creators.flatMap((creator) => toCreatorList(creator.category)))],
    types: [...new Set(creators.flatMap((creator) => toCreatorList(creator.type)))],
  }), [creators])
  const filteredCreators = useMemo(() => creators.filter((creator) => matchesCreatorFilters(creator, filters, numericFilters)), [creators, filters, numericFilters])
  const displayedCreators = useMemo(() => sortCreators(filteredCreators, sortCriteria), [filteredCreators, sortCriteria])
  const selectedCreator = creators.find((creator) => creator.id === selectedCreatorId)
  const editingCreator = creators.find((creator) => creator.id === editingCreatorId)

  useEffect(() => {
    if (!isFullscreen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isFullscreen])

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const resetFilters = () => { setFilters(DEFAULT_CREATOR_FILTERS); setNumericFilters([]) }
  const handleAdd = async (form) => { await addCreator(form); setAddOpen(false) }
  const handleEdit = async (form) => { await saveCreatorDetails(editingCreatorId, form); setEditingCreatorId(null) }
  const openCreatorEdit = (creatorId) => { setSelectedCreatorId(null); setEditingCreatorId(creatorId) }
  const handleQuickAdd = () => { resetFilters(); addQuickCreator() }
  const handleExport = () => {
    exportCreatorsToCsv(displayedCreators)
    showToast(`Đã Export ${displayedCreators.length} profile Creator`)
  }
  const handleImport = async (file, mode) => {
    try {
      const result = await parseCreatorImportFile(file, creators, mode)
      if (!result.creators.length) {
        showToast(`Không có thay đổi để import. ${result.unchangedCount} Creator không đổi, ${result.duplicateCount} dòng trùng trong file, ${result.errors.length} dòng lỗi.`)
        return
      }
      resetFilters()
      setSortCriteria([])
      beginCreatorEditSession()
      applyCreatorImport(result.creators, mode, result)
      setImportReview({
        mode, fileName: file.name, importedCount: result.creators.length,
        createdCount: result.createdCount, updatedCount: result.updatedCount, unchangedCount: result.unchangedCount,
        duplicateCount: result.duplicateCount, errorCount: result.errors.length, errors: result.errors,
        createdIds: result.createdIds, updatedIds: result.updatedIds,
      })
      setIsFullscreen(true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đọc file import.')
    }
  }
  const acceptImport = () => {
    commitCreatorEditSession()
    showToast(`Đã áp dụng ${importReview?.createdCount || 0} Creator mới và ${importReview?.updatedCount || 0} Creator cập nhật`)
    setImportReview(null)
  }
  const cancelImport = () => {
    cancelCreatorEditSession()
    setImportReview(null)
  }
  const workspaceProps = {
    creators: displayedCreators, allCreators: creators, filters, filterOptions, numericFilters, sortCriteria, categoryDisplayLevel, canUndo, canRedo, recentlyAddedCreatorId, importReview, canManage: canManageCreators,
    onFilterChange: updateFilter,
    onAddNumericFilter: (filter) => setNumericFilters((current) => [...current, filter]),
    onRemoveNumericFilter: (filterId) => setNumericFilters((current) => current.filter((filter) => filter.id !== filterId)),
    onReset: resetFilters,
    onSort: (key) => setSortCriteria((current) => cycleCreatorSort(current, key)),
    onCategoryDisplayLevelChange: setCategoryDisplayLevel,
    onSelect: setSelectedCreatorId,
    onArchive: toggleArchive,
    onUpdateCreator: updateCreator,
    onDeleteCreator: deleteCreator,
    onQuickAdd: handleQuickAdd,
    onUndo: undoCreators,
    onRedo: redoCreators,
    onBeginEdit: beginCreatorEditSession,
    onCommitEdit: commitCreatorEditSession,
    onCancelEdit: cancelCreatorEditSession,
    onAcceptImport: acceptImport,
    onCancelImport: cancelImport,
    onImport: handleImport,
    onExport: handleExport,
    onAddCreator: () => setAddOpen(true),
  }

  return (
    <main className="page creators-page">
      <section className="page-heading creators-heading" data-tour="creators-heading">
        <div><p className="page-kicker">Danh sách Creator</p><h1 className='font-bold'>Creators</h1><p className='font-bold'>Tìm kiếm, sắp xếp và quản lý mạng lưới Creators một cách nhanh chóng và dễ dàng.</p></div>
        <div className="heading-actions"><button className="secondary-button" data-tour="page-export" onClick={handleExport}><Icon name="download" />Export</button>{canManageCreators && <><CreatorImportMenu tourId="page-import" onImport={handleImport} /><button className="primary-button" data-tour="page-add" onClick={() => setAddOpen(true)}><Icon name="plus" />Thêm Creator</button></>}</div>
      </section>
      <CreatorSummary creators={creators} onSelect={setSelectedCreatorId} />
      {!isFullscreen && <CreatorWorkspace {...workspaceProps} onEnterFullscreen={() => setIsFullscreen(true)} />}
      {isFullscreen && <CreatorWorkspace {...workspaceProps} isFullscreen onExitFullscreen={() => setIsFullscreen(false)} />}
      <CreatorDetailsDrawer creator={selectedCreator} campaigns={campaigns} canManage={canManageCreators} canAssignCampaign={canAssignCampaign} onClose={() => setSelectedCreatorId(null)} onArchive={toggleArchive} onEdit={openCreatorEdit} onAssignCampaign={assignCreatorToCampaign} />
      {canManageCreators && addOpen && <AddCreatorModal creators={creators} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />}
      {canManageCreators && editingCreator && <AddCreatorModal creator={editingCreator} creators={creators} onClose={() => setEditingCreatorId(null)} onSubmit={handleEdit} />}
    </main>
  )
}
