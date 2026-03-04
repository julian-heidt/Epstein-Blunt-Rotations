import { useState, useMemo } from 'react'

/**
 * Grid of all available people. User picks up to maxCount.
 * Has search, select/deselect, random fill, and Submit.
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
        <button
          className="btn-primary"
          onClick={() => onDone(selected)}
          disabled={selected.length === 0}
        >
          Sit Down ({selected.length})
        </button>
      </div>
    </div>
  )
}
