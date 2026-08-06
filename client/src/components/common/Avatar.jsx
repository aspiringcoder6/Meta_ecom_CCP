export default function Avatar({ creator, size = 'medium' }) {
  return <span className={`avatar avatar-${size}`} style={{ background: creator.color, color: creator.accent }}>{creator.initials}</span>
}
