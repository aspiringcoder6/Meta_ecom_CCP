import Icon from './Icon'

export default function Toast({ message }) {
  if (!message) return null
  return <div className="toast"><span><Icon name="checkSquare" size={18} /></span>{message}</div>
}
