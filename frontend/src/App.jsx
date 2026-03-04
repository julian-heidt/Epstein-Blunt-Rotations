import { useState, useEffect } from 'react'
import Header from './components/Header'
import PersonPicker from './components/PersonPicker'
import RotationTable from './components/RotationTable'
import PersonModal from './components/PersonModal'
import ShareButton from './components/ShareButton'
import { fetchPeople, fetchRandomPeople, fetchPerson } from './api'

const TAGLINES = [
  "Who's getting invited to the cookout?",
  "The table has been set.",
  "Jeffrey's Rolodex Roulette",
  "Your dinner party from hell",
  "Pull up a chair. You're already on the list.",
  "Everybody eats.",
  "The flight manifest, but make it a dinner party",
  "The most exclusive table you never wanted to sit at",
  "Rotating the roster. No flight required.",
  "Your blunt rotation just got a lot more cursed.",
]

export default function App() {
  const [screen, setScreen] = useState('home') // home | pick | table
  const [allPeople, setAllPeople] = useState([])
  const [selectedPeople, setSelectedPeople] = useState([])
  const [seatCount, setSeatCount] = useState(5)
  const [modalPerson, setModalPerson] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tagline, setTagline] = useState('')
  const [error, setError] = useState(null)

  // Rotate tagline
  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)])
    const interval = setInterval(() => {
      setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)])
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Load all people on mount
  useEffect(() => {
    fetchPeople(true)
      .then(setAllPeople)
      .catch(err => {
        console.error(err)
        setError('Failed to load data. Is the backend running?')
      })
  }, [])

  const handleRandomize = async () => {
    setLoading(true)
    try {
      const people = await fetchRandomPeople(seatCount)
      setSelectedPeople(people)
      setScreen('table')
    } catch (err) {
      console.error(err)
      setError('Failed to generate rotation. Try again.')
    }
    setLoading(false)
  }

  const handlePickDone = (picked) => {
    setSelectedPeople(picked)
    setScreen('table')
  }

  const handleSeatClick = async (person) => {
    try {
      const detail = await fetchPerson(person.slug)
      setModalPerson(detail)
    } catch {
      // Fallback: show what we have
      setModalPerson(person)
    }
  }

  const handleRespin = async () => {
    setLoading(true)
    try {
      const people = await fetchRandomPeople(seatCount)
      setSelectedPeople(people)
    } catch {
      setError('Failed to respin. Try again.')
    }
    setLoading(false)
  }

  const handleBack = () => {
    setScreen('home')
    setSelectedPeople([])
    setModalPerson(null)
  }

  return (
    <div className="app">
      {error && (
        <div className="toast-error" onClick={() => setError(null)}>
          {error} <span className="toast-close">✕</span>
        </div>
      )}

      {screen === 'home' && (
        <div className="home-screen">
          <Header tagline={tagline} />
          <div className="controls">
            <div className="seat-selector">
              <label>How many at the table?</label>
              <div className="seat-buttons">
                {[3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    className={`seat-btn ${seatCount === n ? 'active' : ''}`}
                    onClick={() => setSeatCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="action-buttons">
              <button
                className="btn-primary"
                onClick={handleRandomize}
                disabled={loading}
              >
                {loading ? 'Checking the flight logs...' : 'Randomize'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setScreen('pick')}
                disabled={loading || allPeople.length === 0}
              >
                Pick Your Table
              </button>
            </div>
          </div>
          <footer className="footer">
            <p>data from <a href="https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files" target="_blank" rel="noreferrer">wikipedia</a> & <a href="https://jmail.world/person" target="_blank" rel="noreferrer">jmail.world</a></p>
            <p className="footer-joke">no one at this table is having a good time</p>
            <p className="footer-license">licensed under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></p>
          </footer>
        </div>
      )}

      {screen === 'pick' && (
        <PersonPicker
          people={allPeople}
          maxCount={seatCount}
          onDone={handlePickDone}
          onBack={handleBack}
          onRandomFill={async (remaining) => {
            const randoms = await fetchRandomPeople(remaining)
            return randoms
          }}
        />
      )}

      {screen === 'table' && (
        <div className="table-screen">
          <div className="table-header">
            <button className="btn-ghost" onClick={handleBack}>← Back</button>
            <button className="btn-ghost" onClick={handleRespin} disabled={loading}>
              {loading ? '...' : '🔄 Spin Again'}
            </button>
            <ShareButton people={selectedPeople} />
          </div>
          <RotationTable
            people={selectedPeople}
            onSeatClick={handleSeatClick}
          />
          <p className="table-tagline">{tagline}</p>
        </div>
      )}

      {modalPerson && (
        <PersonModal
          person={modalPerson}
          onClose={() => setModalPerson(null)}
        />
      )}
    </div>
  )
}
