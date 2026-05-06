/**
 * Persistent navigation bar — visible on all screens.
 * Includes theme (Blueprint/Forest) and mode (Dark/Light) toggles.
 */
import { useState, useEffect } from 'react'

export default function NavBar({ screen, onNavigate }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ebr-theme') || 'blueprint')
  const [mode, setMode] = useState(() => localStorage.getItem('ebr-mode') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', mode)
    localStorage.setItem('ebr-theme', theme)
    localStorage.setItem('ebr-mode', mode)
  }, [theme, mode])

  return (
    <nav className="navbar">
      <span className="navbar-brand" onClick={() => onNavigate('home')}>
        <span className="navbar-brand-tile">EB</span>
        <span className="navbar-brand-label">Evil Blunts</span>
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

      <div className="navbar-controls">
        <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
          <button
            className="theme-btn"
            role="radio"
            aria-label="Blueprint theme"
            aria-checked={theme === 'blueprint'}
            onClick={() => setTheme('blueprint')}
          >
            B
          </button>
          <button
            className="theme-btn"
            role="radio"
            aria-label="Forest theme"
            aria-checked={theme === 'forest'}
            onClick={() => setTheme('forest')}
          >
            F
          </button>
        </div>

        <button
          className="mode-btn"
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={mode === 'light'}
          onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}
        >
          {mode === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  )
}
