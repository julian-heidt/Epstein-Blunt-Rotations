import { useState, useEffect } from 'react'

const EMOJIS = ['🪑', '🍽️', '💀', '✈️', '🏝️']

export default function Header({ tagline }) {
  const [emoji, setEmoji] = useState('🪑')

  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="header">
      <div className="header-emoji">{emoji}</div>
      <h1 className="header-title">
        Epstein Blunt Rotations
      </h1>
      <p className="header-tagline" key={tagline}>
        {tagline}
      </p>
    </header>
  )
}
