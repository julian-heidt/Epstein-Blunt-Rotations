import { useState, useMemo } from 'react'

// The backend rejects a rotation with fewer than 3 people (422), so the
// picker must not let a smaller table through.
const MIN_PEOPLE = 3

/**
 * Grid of all available people. User picks up to maxCount.
 * Has search, select/deselect, random fill, and Submit. Submit needs at
 * least MIN_PEOPLE people.
 */
export default function PersonPicker({ people, maxCount, onDone, onBack, onRandomFill }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [filling, setFilling] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return people
    const q = search.toLowerCase()
    return people.filter(p => p.name.toLowerCase().includes(q))
  }, [people, search])

  const toggle = (person) => {
    setSelected(prev => {
      const exists = prev.find(p => p.slug === person.slug)
      if (exists) return prev.filter(p => p.slug !== person.slug)
      if (prev.length >= maxCount) return prev // at limit
      return [...prev, person]
    })
  }

  const handleRandomFill = async () => {
    const remaining = maxCount - selected.length
    if (remaining <= 0) return
    setFilling(true)
    try {
      const randoms = await onRandomFill(remaining)
      // Don't add duplicates
      const existingSlugs = new Set(selected.map(p => p.slug))
      const unique = randoms.filter(p => !existingSlugs.has(p.slug))
      setSelected(prev => [...prev, ...unique].slice(0, maxCount))
    } catch {
      // silent fail
    }
    setFilling(false)
  }

  const isSelected = (slug) => selected.some(p => p.slug === slug)

  const needed = MIN_PEOPLE - selected.length
  const canSit = needed <= 0

  return (
    <div className="picker">
      <div className="picker-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h2>Pick Your Table</h2>
        <span className="picker-count">
          {selected.length}/{maxCount}
        </span>
      </div>

      <div className="picker-toolbar">
        <input
          className="picker-search"
          type="text"
          placeholder="Search names..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button
          className="btn-small"
          onClick={handleRandomFill}
          disabled={filling || selected.length >= maxCount}
        >
          {filling ? '...' : `Fill Random (${maxCount - selected.length})`}
        </button>
      </div>

      <div className="picker-grid">
        {filtered.map(person => (
          <div
            key={person.slug}
            className={`picker-card ${isSelected(person.slug) ? 'picker-card--selected' : ''}`}
            onClick={() => toggle(person)}
          >
            <div className="picker-card-photo">
              {person.photo_url ? (
                <img src={person.photo_url} alt={person.name} loading="lazy" />
              ) : (
                <span className="picker-card-initials">
                  {person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="picker-card-name">{person.name}</span>
            {isSelected(person.slug) && <span className="picker-card-check">✓</span>}
          </div>
        ))}
      </div>

      <div className="picker-footer">
        {!canSit && (
          <p className="picker-hint" role="status">
            A table needs at least {MIN_PEOPLE} people. Pick {needed} more.
          </p>
        )}
        <button
          className="btn-primary"
          onClick={() => canSit && onDone(selected)}
          disabled={!canSit}
        >
          Sit Down ({selected.length})
        </button>
      </div>
    </div>
  )
}
