import { useEffect } from 'react'

/**
 * Modal overlay showing person details on seat click.
 */
export default function PersonModal({ person, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const emailBadge = person.email_count
    ? person.email_count >= 100
      ? '🔥 100+ emails'
      : person.email_count >= 20
        ? `📧 ${person.email_count} emails`
        : `📧 ${person.email_count} email${person.email_count === 1 ? '' : 's'}`
    : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          {person.photo_url ? (
            <img
              className="modal-photo"
              src={person.photo_url}
              alt={person.name}
            />
          ) : (
            <div className="modal-photo modal-photo--placeholder">
              {person.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="modal-meta">
            <h2 className="modal-name">{person.name}</h2>
            {emailBadge && <span className="modal-badge">{emailBadge}</span>}
            {person.section_letter && (
              <span className="modal-section">Section: {person.section_letter}</span>
            )}
          </div>
        </div>

        <div className="modal-body">
          {person.description && (
            <p className="modal-description">{person.description}</p>
          )}
          {person.jmail_description && person.jmail_description !== person.description && (
            <p className="modal-jmail-desc">
              <em>jmail:</em> {person.jmail_description}
            </p>
          )}
        </div>

        <div className="modal-links">
          {person.wikipedia_url && (
            <a
              href={person.wikipedia_url}
              target="_blank"
              rel="noreferrer"
              className="modal-link"
            >
              Wikipedia ↗
            </a>
          )}
          {person.jmail_url && (
            <a
              href={person.jmail_url}
              target="_blank"
              rel="noreferrer"
              className="modal-link"
            >
              jmail.world ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
