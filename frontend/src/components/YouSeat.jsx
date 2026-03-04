/**
 * The "Epstein" seat — always at the top of the table.
 */
export default function YouSeat({ style }) {
  return (
    <div className="seat seat--you seat--above" style={style}>
      <div className="seat-avatar seat-avatar--you">
        <span className="you-emoji">👹</span>
      </div>
      <span className="seat-name seat-name--you">EPSTEIN</span>
    </div>
  )
}
