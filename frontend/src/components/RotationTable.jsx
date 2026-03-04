import Seat from './Seat'
import YouSeat from './YouSeat'

/**
 * Circular table with evenly-spaced seats.
 * "YOU" is always at the top (12 o'clock position).
 * Seats are positioned using trig on a circle.
 */
export default function RotationTable({ people, onSeatClick }) {
  const totalSeats = people.length + 1 // +1 for YOU
  const angleStep = 360 / totalSeats

  // Table dimensions (responsive via CSS)
  const cx = 50 // center x (%)
  const cy = 50 // center y (%)
  const radius = 38 // seat orbit radius (%)

  const seats = []

  // YOU is always seat 0, at 270° (top in standard math coords)
  const youAngle = 270
  const youRad = (youAngle * Math.PI) / 180
  seats.push({
    key: 'you',
    isYou: true,
    angle: youAngle,
    x: cx + radius * Math.cos(youRad),
    y: cy + radius * Math.sin(youRad),
  })

  // Place guests clockwise starting from YOU
  people.forEach((person, i) => {
    const angle = youAngle + (i + 1) * angleStep
    const rad = (angle * Math.PI) / 180
    seats.push({
      key: person.slug || person.name,
      isYou: false,
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
          seat.isYou ? (
            <YouSeat
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
