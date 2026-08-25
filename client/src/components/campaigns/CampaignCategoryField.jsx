import { useMemo } from 'react'
import { toCreatorList } from '../../utils/creatorLists'
import { uniqueCategoryPaths } from '../../utils/creatorCategoryPaths'
import Icon from '../common/Icon'
import CreatorCategoryFilter from '../creators/CreatorCategoryFilter'

export default function CampaignCategoryField({ creators = [], value, onChange, disabled = false }) {
  const selected = useMemo(() => Array.isArray(value) ? value : [], [value])
  const options = useMemo(() => uniqueCategoryPaths([
    ...creators.flatMap((creator) => toCreatorList(creator.category)),
    ...selected,
  ]), [creators, selected])

  const remove = (category) => onChange(selected.filter((item) => item !== category))

  return (
    <div className={`campaign-category-field ${disabled ? 'is-disabled' : ''}`}>
      <div className="campaign-category-picker">
        <CreatorCategoryFilter
          values={selected}
          options={options}
          onChange={disabled ? () => {} : onChange}
          label="Category Campaign"
          emptyLabel="Chọn Category"
          clearLabel="Không chọn Category"
          helperText="Hover để chọn Subcategory"
          ariaLabel="Chọn Category cho Campaign"
        />
      </div>
      {selected.length > 0
        ? <div className="campaign-category-selection">{selected.map((category) => <span key={category}>{category}{!disabled && <button type="button" onClick={() => remove(category)} aria-label={`Bỏ ${category}`}><Icon name="close" size={11} /></button>}</span>)}</div>
        : <p>Chưa chọn Category. Danh sách được lấy từ Category và Subcategory hiện có trong kho Creator.</p>}
    </div>
  )
}
