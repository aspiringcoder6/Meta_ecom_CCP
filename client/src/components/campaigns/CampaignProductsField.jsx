import { useEffect, useRef, useState } from 'react'
import { normalizeProducts, sameProducts } from '../../utils/campaignProducts'
import ProductAutocompleteInput from '../common/ProductAutocompleteInput'

export default function CampaignProductsField({ products, options, onCommit, label }) {
  const [draft, setDraft] = useState(() => normalizeProducts(products).join(', '))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(normalizeProducts(products).join(', ')) }, [products])
  return <ProductAutocompleteInput value={draft} options={options} label={label} onChange={setDraft}
    onFocus={() => { focused.current = true }}
    onBlur={() => {
      focused.current = false
      const next = normalizeProducts(draft)
      setDraft(next.join(', '))
      if (!sameProducts(next, products)) onCommit(next)
    }} />
}
