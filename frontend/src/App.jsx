import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import NavBar from './components/NavBar'
import PersonPicker from './components/PersonPicker'
import RotationTable from './components/RotationTable'
import PersonModal from './components/PersonModal'
import ShareButton from './components/ShareButton'
import VoteButtons from './components/VoteButtons'
import Leaderboard from './components/Leaderboard'
import {
  fetchPeople,
  fetchRandomPeople,
  fetchPerson,
  saveRotation,
  voteOnRotation,
  fetchRotation,
  getVoterToken,
  computeTableHash,
} from './api'

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
  const navigate = useNavigate()
  const location = useLocation()

  // Derive current screen and table hash from URL — single source of truth
  const urlHash = location.pathname.startsWith('/table/')
    ? location.pathname.split('/')[2]
    : null
  const screen = urlHash ? 'table'
    : location.pathname === '/leaderboard' ? 'leaderboard'
    : location.pathname === '/pick' ? 'pick'
    : 'home'

  const [allPeople, setAllPeople] = useState([])
  const [selectedPeople, setSelectedPeople] = useState([])
  const [seatCount, setSeatCount] = useState(5)
  const [modalPerson, setModalPerson] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deepLinkLoading, setDeepLinkLoading] = useState(false)
  const [tagline, setTagline] = useState('')
  const [error, setError] = useState(null)
  const [tableHash, setTableHash] = useState(null)
  const [rotation, setRotation] = useState(null)
  const voterToken = getVoterToken()

  // Tracks in-app navigations so the deep-link effect doesn't re-fetch when
  // we've already set state before calling navigate()
  const intentionalNavRef = useRef(false)

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

  // Deep-link loader: when arriving at /table/:hash with no local state
  // (e.g. bookmarked URL, shared link, browser back/forward)
  useEffect(() => {
    if (!urlHash) return

    // In-app navigation — state is already set, skip the API call
    if (intentionalNavRef.current) {
      intentionalNavRef.current = false
      return
    }

    setDeepLinkLoading(true)
    fetchRotation(urlHash, voterToken)
      .then(detail => {
        const people = detail.people.map(p => ({
          name: p.name,
          slug: p.slug,
          photo_url: p.photo_url,
          has_photo: !!p.photo_url,
        }))
        setSelectedPeople(people)
        setSeatCount(detail.seat_count)
        setTableHash(urlHash)
        setRotation(detail)
      })
      .catch(() => {
        setError("Table not found — it may not have been saved yet. Check the leaderboard!")
        navigate('/')
      })
      .finally(() => setDeepLinkLoading(false))
  }, [urlHash]) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to a table route, marking it as intentional so the deep-link
  // effect skips the redundant API call.
  const _goToTable = (hash) => {
    intentionalNavRef.current = true
    navigate('/table/' + hash)
  }

  const handleRandomize = async () => {
    setLoading(true)
    try {
      const people = await fetchRandomPeople(seatCount)
      const slugs = people.map(p => p.slug)
      const newHash = await computeTableHash(slugs)
      // Set state and navigate immediately — no backend round-trip needed
      setSelectedPeople(people)
      setTableHash(newHash)
      setRotation(null)
      _goToTable(newHash)
      // Save in background — VoteButtons appear when it finishes
      _saveRotation(people, newHash)
    } catch (err) {
      console.error(err)
      setError('Failed to generate rotation. Try again.')
    }
    setLoading(false)
  }

  const handlePickDone = async (picked) => {
    const slugs = picked.map(p => p.slug)
    const newHash = await computeTableHash(slugs)
    setSelectedPeople(picked)
    setTableHash(newHash)
    setRotation(null)
    _goToTable(newHash)
    _saveRotation(picked, newHash)
  }

  const _saveRotation = async (people, precomputedHash = null) => {
    try {
      const slugs = people.map(p => p.slug)
      const saved = await saveRotation(slugs)
      const detail = await fetchRotation(saved.table_hash, voterToken)
      setRotation(detail)
      // If backend hash somehow differs (shouldn't happen), correct the URL
      if (precomputedHash && saved.table_hash !== precomputedHash) {
        setTableHash(saved.table_hash)
        intentionalNavRef.current = true
        navigate('/table/' + saved.table_hash, { replace: true })
      }
    } catch (err) {
      console.error('Auto-save rotation failed:', err)
      // Non-fatal — table still shows, VoteButtons just won't appear
    }
  }

  const handleSeatClick = async (person) => {
    try {
      const detail = await fetchPerson(person.slug)
      setModalPerson(detail)
    } catch {
      setModalPerson(person)
    }
  }

  const handleRespin = async () => {
    setLoading(true)
    setRotation(null)
    try {
      const people = await fetchRandomPeople(seatCount)
      const slugs = people.map(p => p.slug)
      const newHash = await computeTableHash(slugs)
      setSelectedPeople(people)
      setTableHash(newHash)
      _goToTable(newHash)
      _saveRotation(people, newHash)
    } catch {
      setError('Failed to respin. Try again.')
    }
    setLoading(false)
  }

  const handleBack = () => {
    navigate('/')
    setSelectedPeople([])
    setModalPerson(null)
    setTableHash(null)
    setRotation(null)
  }

  const handleNavigate = (target) => {
    if (target === 'home') {
      handleBack()
    } else {
      navigate('/' + target)
    }
  }

  const handleViewLeaderboardTable = async (rot) => {
    const people = rot.people.map(p => ({
      name: p.name,
      slug: p.slug,
      photo_url: p.photo_url,
      has_photo: !!p.photo_url,
    }))
    setSelectedPeople(people)
    setSeatCount(rot.seat_count)
    setTableHash(rot.table_hash)
    setRotation(rot)     // Show immediately with leaderboard counts
    _goToTable(rot.table_hash)
    // Fetch full detail with user_vote in background
    try {
      const detail = await fetchRotation(rot.table_hash, voterToken)
      setRotation(detail) // VoteButtons syncs via its useEffect
    } catch {
      // keep rot as-is — upvotes/downvotes are still correct, user_vote just unknown
    }
  }

  if (deepLinkLoading) {
    return (
      <div className="app">
        <NavBar screen="table" onNavigate={handleNavigate} />
        <div className="deep-link-loading">
          <p>Loading table...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <NavBar screen={screen} onNavigate={handleNavigate} />

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
                onClick={() => navigate('/pick')}
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
            <ShareButton people={selectedPeople} tableHash={tableHash} />
          </div>
          <RotationTable
            people={selectedPeople}
            onSeatClick={handleSeatClick}
          />
          {tableHash && rotation && (
            <VoteButtons
              tableHash={tableHash}
              rotation={rotation}
              voterToken={voterToken}
              onVote={voteOnRotation}
              onError={setError}
            />
          )}
          <p className="table-tagline">{tagline}</p>
        </div>
      )}

      {screen === 'leaderboard' && (
        <Leaderboard onViewTable={handleViewLeaderboardTable} />
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
