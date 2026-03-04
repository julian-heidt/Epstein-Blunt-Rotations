/**
 * Individual seat at the round table — shows a photo circle + name.
 */
export default function Seat({ person, labelPos, onClick, style }) {
  const fallbackInitials = person.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`seat seat--${labelPos}`}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      title={`Click for info on ${person.name}`}
    >
      <div className="seat-avatar">
        {person.photo_url ? (
          <img
            src={person.photo_url}
            alt={person.name}
            loading="lazy"
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <span
          className="seat-initials"
          style={{ display: person.photo_url ? 'none' : 'flex' }}
        >
          {fallbackInitials}
        </span>
      </div>
      <span className="seat-name">{person.name}</span>
    </div>
  )
}
