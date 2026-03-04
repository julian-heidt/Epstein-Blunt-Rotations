/**
 * Generates a shareable URL or copies table to clipboard.
 */
export default function ShareButton({ people }) {
  const handleShare = async () => {
    const names = people.map(p => p.name).join(', ')
    const text = `My cursed blunt rotation: ${names} 🪑💀\n\n#CursedBluntRotation`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Cursed Blunt Rotation', text })
        return
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
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
