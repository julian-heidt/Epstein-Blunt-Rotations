import Seat from './Seat'
import EpsteinSeat from './EpsteinSeat'

/**
 * Circular table with evenly-spaced seats.
 * Epstein is always at the top (12 o'clock position).
 * Seats are positioned using trig on a circle.
 */
export default function RotationTable({ people, onSeatClick }) {
  const totalSeats = people.length + 1 // +1 for Epstein
  const angleStep = 360 / totalSeats

  // Table dimensions (responsive via CSS)
  const cx = 50 // center x (%)
  const cy = 50 // center y (%)
  const radius = 38 // seat orbit radius (%)

  const seats = []

  // Epstein is always seat 0, at 270° (top in standard math coords)
  const epsteinAngle = 270
  const epsteinRad = (epsteinAngle * Math.PI) / 180
  seats.push({
    key: 'epstein',
    isEpstein: true,
    angle: epsteinAngle,
    x: cx + radius * Math.cos(epsteinRad),
    y: cy + radius * Math.sin(epsteinRad),
  })

  // Place guests clockwise starting from Epstein
  people.forEach((person, i) => {
    const angle = epsteinAngle + (i + 1) * angleStep
    const rad = (angle * Math.PI) / 180
    seats.push({
      key: person.slug || person.name,
      isEpstein: false,
      person,
      angle: angle % 360,
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    })
  })

  // All names render below the avatar
  const getLabelPos = () => 'below'

  return (
    <div className="rotation-table-wrapper">
      <div className="rotation-table">
        {/* The round table surface */}
        <div className="table-surface" />

        {seats.map((seat) =>
          seat.isEpstein ? (
            <EpsteinSeat
              key={seat.key}
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
              }}
            />
          ) : (
            <Seat
              key={seat.key}
              person={seat.person}
              labelPos={getLabelPos(seat.angle)}
              onClick={() => onSeatClick(seat.person)}
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
              }}
            />
          )
        )}
      </div>
    </div>
  )
}
