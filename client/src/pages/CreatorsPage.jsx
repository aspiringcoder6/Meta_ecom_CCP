import { useMemo, useState } from 'react'
import AddCreatorModal from '../components/creators/AddCreatorModal'
import CreatorDetailsDrawer from '../components/creators/CreatorDetailsDrawer'
import CreatorSummary from '../components/creators/CreatorSummary'
import CreatorTable from '../components/creators/CreatorTable'
import CreatorToolbar from '../components/creators/CreatorToolbar'
import Icon from '../components/common/Icon'
import { useApp } from '../hooks/useApp'
import { exportCreatorsToCsv } from '../utils/exportCreators'

const DEFAULT_FILTERS = { search: '', segment: 'all', category: 'all', type: 'all' }

function matchesFilters(creator, filters) {
  const query = filters.search.toLowerCase().trim()
  const matchesSearch = !query || [creator.name, creator.tiktokId, creator.category, creator.scope, creator.contact].some((value) => value.toLowerCase().includes(query))
  return matchesSearch
    && (filters.segment === 'all' || creator.segment === filters.segment)
    && (filters.category === 'all' || creator.category === filters.category)
    && (filters.type === 'all' || creator.type === filters.type)
}

export default function CreatorsPage() {
  const { creators, addCreator, toggleArchive, showToast } = useApp()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [selectedCreatorId, setSelectedCreatorId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const filterOptions = useMemo(() => ({
    segments: [...new Set(creators.map((creator) => creator.segment))],
    categories: [...new Set(creators.map((creator) => creator.category))],
    types: [...new Set(creators.map((creator) => creator.type))],
  }), [creators])
  const filteredCreators = useMemo(() => creators.filter((creator) => matchesFilters(creator, filters)), [creators, filters])
  const selectedCreator = creators.find((creator) => creator.id === selectedCreatorId)

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const handleAdd = (form) => {
    addCreator(form)
    setAddOpen(false)
  }
  const handleExport = () => {
    exportCreatorsToCsv(filteredCreators)
    showToast(`Đã Export ${filteredCreators.length} profile Creator`)
  }

  return (
    <main className="page creators-page">
      <section className="page-heading creators-heading">
        <div><p className="page-kicker">Kho Creator</p><h1>Creators</h1><p>Tìm kiếm, sắp xếp và quản lý mạng lưới Creator tại một nơi.</p></div>
        <div className="heading-actions"><button className="secondary-button" onClick={handleExport}><Icon name="download" />Export</button><button className="primary-button" onClick={() => setAddOpen(true)}><Icon name="plus" />Thêm Creator</button></div>
      </section>

      <CreatorSummary creators={creators} />
      <section className="panel creators-panel">
        <CreatorToolbar filters={filters} options={filterOptions} onFilterChange={updateFilter} onReset={() => setFilters(DEFAULT_FILTERS)} />
        <div className="table-meta"><span><strong>{filteredCreators.length}</strong> Creator</span><span>Cuộn ngang để xem toàn bộ thông tin</span></div>
        <CreatorTable creators={filteredCreators} onSelect={setSelectedCreatorId} onArchive={toggleArchive} />
        <div className="pagination"><span>Hiển thị 1–{filteredCreators.length} trên {filteredCreators.length}</span><div><button disabled>Trước</button><button className="page-active">1</button><button disabled>Sau</button></div></div>
      </section>

      <CreatorDetailsDrawer creator={selectedCreator} onClose={() => setSelectedCreatorId(null)} onArchive={toggleArchive} />
      {addOpen && <AddCreatorModal onClose={() => setAddOpen(false)} onAdd={handleAdd} />}
    </main>
  )
}
