/**
 * The Epstein seat — always at the top of the table.
 */
export default function EpsteinSeat({ style }) {
  return (
    <div className="seat seat--epstein seat--above" style={style}>
      <div className="seat-avatar seat-avatar--epstein">
        <img src="/epstein.webp" alt="Jeffrey Epstein" />
      </div>
      <span className="seat-name seat-name--epstein">EPSTEIN</span>
    </div>
  )
}
