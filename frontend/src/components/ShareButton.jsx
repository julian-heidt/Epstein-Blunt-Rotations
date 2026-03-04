/**
 * Generates a shareable URL or copies table to clipboard.
 * If tableHash is provided, shares a direct link to the table.
 * Falls back to plain-text name list if hash isn't available yet.
 */
export default function ShareButton({ people, tableHash }) {
  const handleShare = async () => {
    const names = people.map(p => p.name).join(', ')
    const url = tableHash ? `${window.location.origin}/table/${tableHash}` : null
    const text = `My Epstein Blunt Rotation: ${names} 🪑💀`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Epstein Blunt Rotations',
          text: url ? text : `${text}\n\n#CursedBluntRotation`,
          ...(url ? { url } : {}),
        })
        return
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Desktop fallback — copy URL if available, else copy text
    const toCopy = url ? url : `${text}\n\n#CursedBluntRotation`
    try {
      await navigator.clipboard.writeText(toCopy)
      alert(url ? 'Link copied to clipboard!' : 'Copied to clipboard!')
    } catch {
      // Nothing we can do
    }
  }

  return (
    <button className="btn-ghost share-btn" onClick={handleShare}>
      📋 Share
    </button>
  )
}
