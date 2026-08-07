import { useEffect, useMemo, useState } from 'react'
import AddCreatorModal from '../components/creators/AddCreatorModal'
import CreatorDetailsDrawer from '../components/creators/CreatorDetailsDrawer'
import CreatorSummary from '../components/creators/CreatorSummary'
import CreatorWorkspace from '../components/creators/CreatorWorkspace'
import CreatorImportMenu from '../components/creators/CreatorImportMenu'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { DEFAULT_CREATOR_FILTERS, matchesCreatorFilters } from '../utils/creatorFilters'
import { exportCreatorsToCsv } from '../utils/exportCreators'
import { parseCreatorImportFile } from '../utils/creatorImport'

export default function CreatorsPage() {
  const { creators, recentlyAddedCreatorId, addCreator, saveCreatorDetails, addQuickCreator, applyCreatorImport, updateCreator, deleteCreator, toggleArchive, undoCreators, redoCreators, canUndo, canRedo, beginCreatorEditSession, commitCreatorEditSession, cancelCreatorEditSession, showToast } = useApp()
  const [filters, setFilters] = useState(DEFAULT_CREATOR_FILTERS)
  const [numericFilters, setNumericFilters] = useState([])
  const [selectedCreatorId, setSelectedCreatorId] = useState(null)
  const [editingCreatorId, setEditingCreatorId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [importReview, setImportReview] = useState(null)

  const filterOptions = useMemo(() => ({
    segments: [...new Set(creators.map((creator) => creator.segment))],
    categories: [...new Set(creators.map((creator) => creator.category))],
    types: [...new Set(creators.map((creator) => creator.type))],
  }), [creators])
  const filteredCreators = useMemo(() => creators.filter((creator) => matchesCreatorFilters(creator, filters, numericFilters)), [creators, filters, numericFilters])
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
    exportCreatorsToCsv(filteredCreators)
    showToast(`Đã Export ${filteredCreators.length} profile Creator`)
  }
  const handleImport = async (file, mode) => {
    try {
      const result = await parseCreatorImportFile(file, creators, mode)
      if (!result.creators.length) {
        showToast(`Không có Creator hợp lệ để import. ${result.duplicateCount} dòng trùng, ${result.errors.length} dòng lỗi.`)
        return
      }
      resetFilters()
      beginCreatorEditSession()
      applyCreatorImport(result.creators, mode)
      setImportReview({
        mode, fileName: file.name, importedCount: result.creators.length, duplicateCount: result.duplicateCount,
        errorCount: result.errors.length, errors: result.errors, importedIds: result.creators.map((creator) => creator.id),
      })
      setIsFullscreen(true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đọc file import.')
    }
  }
  const acceptImport = () => {
    commitCreatorEditSession()
    showToast(`Đã chấp nhận ${importReview?.importedCount || 0} Creator từ file import`)
    setImportReview(null)
  }
  const cancelImport = () => {
    cancelCreatorEditSession()
    setImportReview(null)
  }
  const workspaceProps = {
    creators: filteredCreators, filters, filterOptions, numericFilters, canUndo, canRedo, recentlyAddedCreatorId, importReview,
    onFilterChange: updateFilter,
    onAddNumericFilter: (filter) => setNumericFilters((current) => [...current, filter]),
    onRemoveNumericFilter: (filterId) => setNumericFilters((current) => current.filter((filter) => filter.id !== filterId)),
    onReset: resetFilters,
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
    onExport: handleExport,
    onAddCreator: () => setAddOpen(true),
  }

  return (
    <main className="page creators-page">
      <section className="page-heading creators-heading">
        <div><p className="page-kicker">Danh sách Creator</p><h1 className='font-bold'>Creators</h1><p className='font-bold'>Tìm kiếm, sắp xếp và quản lý mạng lưới Creators một cách nhanh chóng và dễ dàng.</p></div>
        <div className="heading-actions"><button className="secondary-button" onClick={handleExport}><Icon name="download" />Export</button><CreatorImportMenu onImport={handleImport} /><button className="primary-button" onClick={() => setAddOpen(true)}><Icon name="plus" />Thêm Creator</button></div>
      </section>
      <CreatorSummary creators={creators} />
      <CreatorWorkspace {...workspaceProps} onEnterFullscreen={() => setIsFullscreen(true)} />
      {isFullscreen && <CreatorWorkspace {...workspaceProps} isFullscreen onExitFullscreen={() => setIsFullscreen(false)} />}
      <CreatorDetailsDrawer creator={selectedCreator} onClose={() => setSelectedCreatorId(null)} onArchive={toggleArchive} onEdit={openCreatorEdit} />
      {addOpen && <AddCreatorModal onClose={() => setAddOpen(false)} onSubmit={handleAdd} />}
      {editingCreator && <AddCreatorModal creator={editingCreator} onClose={() => setEditingCreatorId(null)} onSubmit={handleEdit} />}
    </main>
  )
}
