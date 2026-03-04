import { useState, useEffect } from 'react'

/**
 * Upvote / downvote buttons with score display.
 * Shows current vote state and handles the "already voted" case.
 */
export default function VoteButtons({ tableHash, rotation, voterToken, onVote, onError }) {
  const [voting, setVoting] = useState(false)
  const [userVote, setUserVote] = useState(rotation?.user_vote ?? null)
  const [upvotes, setUpvotes] = useState(rotation?.upvotes ?? 0)
  const [downvotes, setDownvotes] = useState(rotation?.downvotes ?? 0)
  const [score, setScore] = useState(rotation?.score ?? 0)

  // Sync with rotation prop when it changes externally (e.g. user_vote arrives async
  // after navigating from the leaderboard, or fresh rotation data loads on deep link).
  // Only syncs if the user hasn't voted yet in this session.
  useEffect(() => {
    if (rotation && userVote === null) {
      setUserVote(rotation.user_vote ?? null)
      setUpvotes(rotation.upvotes ?? 0)
      setDownvotes(rotation.downvotes ?? 0)
      setScore(rotation.score ?? 0)
    }
  }, [rotation])

  const handleVote = async (direction) => {
    if (voting || userVote !== null) return
    setVoting(true)
    try {
      const result = await onVote(tableHash, direction, voterToken)
      setUserVote(direction)
      setUpvotes(result.upvotes)
      setDownvotes(result.downvotes)
      setScore(result.score)
    } catch (err) {
      if (err.status === 409) {
        onError('You already voted on this table today!')
        setUserVote(direction) // Disable buttons
      } else {
        onError('Vote failed. Try again.')
      }
    }
    setVoting(false)
  }

  return (
    <div className="vote-buttons">
      <button
        className={`vote-btn vote-up ${userVote === 1 ? 'voted' : ''}`}
        onClick={() => handleVote(1)}
        disabled={voting || userVote !== null}
        title="Upvote this table"
      >
        ▲ {upvotes}
      </button>
      <span className={`vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
        {score > 0 ? '+' : ''}{score}
      </span>
      <button
        className={`vote-btn vote-down ${userVote === -1 ? 'voted' : ''}`}
        onClick={() => handleVote(-1)}
        disabled={voting || userVote !== null}
        title="Downvote this table"
      >
        ▼ {downvotes}
      </button>
    </div>
  )
}
