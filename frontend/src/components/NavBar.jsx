/**
 * Persistent navigation bar — visible on all screens.
 */
export default function NavBar({ screen, onNavigate }) {
  return (
    <nav className="navbar">
      <span className="navbar-brand" onClick={() => onNavigate('home')}>
        🪑 EBR
      </span>
      <div className="navbar-links">
        <button
          className={`navbar-link ${screen === 'home' || screen === 'pick' || screen === 'table' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          Home
        </button>
        <button
          className={`navbar-link ${screen === 'leaderboard' ? 'active' : ''}`}
          onClick={() => onNavigate('leaderboard')}
        >
          Leaderboard
        </button>
      </div>
    </nav>
  )
}
