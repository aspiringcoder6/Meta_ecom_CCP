const CATEGORY_LAYERS = [
  { value: 1, label: 'Layer 1', title: 'Chỉ hiển thị Category cấp cao nhất' },
  { value: 2, label: 'Layer 2', title: 'Hiển thị Category và Subcategory cấp 2' },
]

export default function CategoryLayerSelector({ value = 1, onChange, tourId }) {
  return (
    <div className="category-layer-selector" data-tour={tourId} role="group" aria-label="Độ sâu hiển thị Category">
      <span className="category-layer-label">Độ sâu</span>
      <div className="category-layer-track">
        {CATEGORY_LAYERS.map((layer) => (
          <button
            className={`category-layer-step layer-${layer.value}${value === layer.value ? ' is-active' : ''}`}
            type="button"
            aria-pressed={value === layer.value}
            title={layer.title}
            onClick={() => onChange(layer.value)}
            key={layer.value}
          >
            <span>{layer.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
