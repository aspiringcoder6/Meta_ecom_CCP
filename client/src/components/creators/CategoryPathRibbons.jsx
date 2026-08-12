import { projectCategoryPaths, splitCategoryPath } from '../../utils/creatorCategoryPaths'

export default function CategoryPathRibbons({ values, level = 1 }) {
  const paths = projectCategoryPaths(values, Math.min(3, Math.max(1, Number(level) || 1)))

  return (
    <div className="category-path-ribbons" aria-label={paths.join(', ')}>
      {paths.map((path) => (
        <span className="category-path-ribbon" title={path} key={path}>
          {splitCategoryPath(path).map((part, index) => (
            <span className={`category-path-segment category-path-level-${Math.min(index + 1, 3)}`} key={`${part}-${index}`}>
              <span>{part}</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  )
}
