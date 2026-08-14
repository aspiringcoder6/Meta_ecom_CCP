import { CREATOR_CATEGORIES } from '../config/labels'

export const CATEGORY_PATH_SEPARATOR = ' > '

function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeRoot(value) {
  const label = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!label) return null
  const key = normalizeKey(value)
  const aliases = { 'mom baby': 'MOM&BABY', 'mom and baby': 'MOM&BABY', other: 'OTHER' }
  return aliases[key] || CREATOR_CATEGORIES.find((category) => normalizeKey(category) === key) || label
}

export function splitCategoryPath(value) {
  return String(value ?? '').split(/\s*>\s*/).map((part) => part.trim()).filter(Boolean)
}

export function normalizeCategoryPath(value) {
  const parts = splitCategoryPath(value)
  const root = normalizeRoot(parts[0])
  if (!root) return null
  const descendants = parts.slice(1, 2).map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean)
  return [root, ...descendants].join(CATEGORY_PATH_SEPARATOR)
}

export function categoryPathKey(value) {
  return splitCategoryPath(value).map(normalizeKey).join('>')
}

export function uniqueCategoryPaths(values) {
  const result = []
  const keys = new Set()
  values.forEach((value) => {
    const normalized = normalizeCategoryPath(value)
    const key = categoryPathKey(normalized)
    if (!normalized || keys.has(key)) return
    keys.add(key)
    result.push(normalized)
  })
  return result
}

export function parseCategoryPaths(value, fallback = ['OTHER']) {
  const rawValues = Array.isArray(value) ? value : [value]
  const paths = []

  rawValues.forEach((rawValue) => {
    const tokens = String(rawValue ?? '').split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean)
    let previousParts = []

    tokens.forEach((token) => {
      const tokenParts = splitCategoryPath(token)
      const expandedParts = tokenParts.length === 1 && previousParts.length > 1
        ? [previousParts[0], tokenParts[0]]
        : tokenParts
      const normalized = normalizeCategoryPath(expandedParts.join(CATEGORY_PATH_SEPARATOR))
      if (!normalized) return
      paths.push(normalized)
      previousParts = splitCategoryPath(normalized)
    })
  })

  const uniquePaths = uniqueCategoryPaths(paths)
  return uniquePaths.length ? uniquePaths : [...fallback]
}

export function mergeCategoryPaths(currentValues, importedValues) {
  let merged = uniqueCategoryPaths(Array.isArray(currentValues) ? currentValues : [currentValues].filter(Boolean))
  const imported = uniqueCategoryPaths(Array.isArray(importedValues) ? importedValues : [importedValues].filter(Boolean))

  imported.forEach((path) => {
    const importedParts = splitCategoryPath(path)
    const importedRootKey = normalizeKey(importedParts[0])
    const hasExistingRoot = merged.some((currentPath) => normalizeKey(splitCategoryPath(currentPath)[0]) === importedRootKey)
    if (importedParts.length === 1 && hasExistingRoot) return
    if (importedParts.length > 1) {
      if (hasExistingRoot) {
        merged = merged.filter((currentPath) => {
          const currentParts = splitCategoryPath(currentPath)
          return !(currentParts.length === 1 && normalizeKey(currentParts[0]) === importedRootKey)
        })
      }
    }
    merged = uniqueCategoryPaths([...merged, path])
  })

  return merged
}

export function categoryPathMatches(candidate, selectedPath) {
  const candidateKey = categoryPathKey(candidate)
  const selectedKey = categoryPathKey(selectedPath)
  return Boolean(candidateKey && selectedKey && (candidateKey === selectedKey || candidateKey.startsWith(`${selectedKey}>`)))
}

export function projectCategoryPaths(values, level = 'all') {
  const paths = Array.isArray(values) ? values : [values].filter(Boolean)
  if (level === 'all') return uniqueCategoryPaths(paths)
  const depth = Math.max(1, Number(level) || 1)
  return uniqueCategoryPaths(paths.map((path) => splitCategoryPath(path).slice(0, depth).join(CATEGORY_PATH_SEPARATOR)))
}

export function formatCategoryPaths(values, separator = ', ', level = 'all') {
  return projectCategoryPaths(values, level).join(separator)
}

export function getMaxCategoryDepth(creators) {
  return Math.max(1, ...creators.flatMap((creator) => (Array.isArray(creator.category) ? creator.category : [creator.category]).map((path) => splitCategoryPath(path).length)))
}

export function buildCategoryTree(paths) {
  const roots = []
  const rootMap = new Map()

  uniqueCategoryPaths(paths).forEach((path) => {
    let nodes = roots
    let nodeMap = rootMap
    const accumulated = []
    splitCategoryPath(path).forEach((label) => {
      accumulated.push(label)
      const key = normalizeKey(label)
      let node = nodeMap.get(key)
      if (!node) {
        node = { label, value: accumulated.join(CATEGORY_PATH_SEPARATOR), children: [], childMap: new Map() }
        nodeMap.set(key, node)
        nodes.push(node)
      }
      nodes = node.children
      nodeMap = node.childMap
    })
  })

  const clean = (nodes) => nodes
    .sort((left, right) => left.label.localeCompare(right.label, 'vi'))
    .map(({ childMap: _childMap, ...node }) => ({ ...node, children: clean(node.children) }))
  return clean(roots)
}
