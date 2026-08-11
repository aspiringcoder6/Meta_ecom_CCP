import { useEffect, useState } from 'react'
import { validateCreatorValue } from '../../utils/creatorValidation'
import { formatCreatorList } from '../../utils/creatorLists'

function draftValue(field, value) {
  return field === 'category' || field === 'type' ? formatCreatorList(value) : String(value ?? '')
}

export default function EditableCreatorCell({ creatorId, field, value, options, className = '', style, note, dataTour, onCommit }) {
  const [draft, setDraft] = useState(draftValue(field, value))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(draftValue(field, value))
    setError('')
  }, [field, value])

  const commit = () => {
    const result = validateCreatorValue(field, draft)
    if (result.error) {
      setError(result.error)
      return
    }
    setError('')
    setDraft(draftValue(field, result.value))
    if (JSON.stringify(result.value) !== JSON.stringify(value)) onCommit(creatorId, { [field]: result.value })
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      setDraft(draftValue(field, value))
      setError('')
      event.currentTarget.blur()
    }
  }

  return (
    <td className={`spreadsheet-cell ${error ? 'is-invalid' : ''} ${className}`} data-tour={dataTour} style={style} onClick={(event) => event.stopPropagation()}>
      {options && field !== 'category' && field !== 'type'
        ? <select value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={handleKeyDown}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
        : <input value={draft} inputMode={['cost', 'extraCost', 'followers', 'gmvMonth'].includes(field) ? 'decimal' : undefined} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={handleKeyDown} />}
      {note && !error && <small className="spreadsheet-cell-note">{note}</small>}
      {error && <span className="cell-error-message" role="alert">{error}</span>}
    </td>
  )
}
