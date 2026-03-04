import { useState, useEffect } from 'react'
import { fetchLeaderboard, getVoterToken } from '../api'

const SORT_OPTIONS = [
  { value: 'score', label: 'Highest Score' },
  { value: 'upvotes', label: 'Most Upvotes' },
  { value: 'downvotes', label: 'Most Downvotes' },
  { value: 'newest', label: 'Newest' },
]

const SEAT_FILTERS = [null, 3, 4, 5, 6, 7]

export default function Leaderboard({ onViewTable }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('score')
  const [seatCount, setSeatCount] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadData = async (reset = false) => {
    setLoading(true)
    try {
      const p = reset ? 1 : page
      const data = await fetchLeaderboard({ sortBy, seatCount, page: p, limit: 20 })
      if (reset) {
        setItems(data.items)
        setPage(1)
      } else {
        setItems(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
    } catch (err) {
      console.error('Leaderboard fetch failed:', err)
    }
    setLoading(false)
  }

  // Reload when filters change
  useEffect(() => {
    loadData(true)
  }, [sortBy, seatCount])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
  }

  // Load more when page changes (but not on initial mount)
  useEffect(() => {
    if (page > 1) loadData(false)
  }, [page])

  const hasMore = items.length < total

  return (
    <div className="leaderboard-screen">
      <div className="leaderboard-header">
        <h2 className="leaderboard-title">Leaderboard</h2>
        <p className="leaderboard-subtitle">The most cursed tables, ranked by the people</p>
      </div>

      <div className="leaderboard-filters">
        <div className="filter-group">
          <label className="filter-label">Sort by</label>
          <select
            className="filter-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Seats</label>
          <div className="filter-pills">
            {SEAT_FILTERS.map(n => (
              <button
                key={n ?? 'all'}
                className={`filter-pill ${seatCount === n ? 'active' : ''}`}
                onClick={() => setSeatCount(n)}
              >
                {n ?? 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 && !loading && (
        <div className="leaderboard-empty">
          <p>No tables yet. Go create one and be the first!</p>
        </div>
      )}

      <div className="leaderboard-list">
        {items.map((rot, idx) => (
          <div
            key={rot.table_hash}
            className="leaderboard-row"
            onClick={() => onViewTable(rot)}
          >
            <span className="lb-rank">#{idx + 1}</span>
            <div className="lb-avatars">
              {rot.people.slice(0, 7).map(p => (
                <div key={p.slug} className="lb-mini-avatar" title={p.name}>
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} />
                  ) : (
                    <span className="lb-mini-initials">
                      {p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="lb-names">
              {rot.people.map(p => p.name).join(', ')}
            </div>
            <span className="lb-seat-badge">{rot.seat_count} seats</span>
            <div className="lb-votes">
              <span className="lb-up">▲ {rot.upvotes}</span>
              <span className="lb-down">▼ {rot.downvotes}</span>
              <span className={`lb-score ${rot.score > 0 ? 'positive' : rot.score < 0 ? 'negative' : ''}`}>
                {rot.score > 0 ? '+' : ''}{rot.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          className="btn-secondary leaderboard-load-more"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
