const API_BASE = '/api';

// --- Voter token (cookie-based anonymous identity) ---

function _getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function _setCookie(name, value, maxAgeDays = 365) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeDays * 86400}; SameSite=Strict`;
}

function _uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
}

export function getVoterToken() {
  let token = _getCookie('voter_token');
  if (!token) {
    token = _uuid();
    _setCookie('voter_token', token);
  }
  return token;
}

// --- People endpoints ---

export async function fetchPeople(hasPhoto = null) {
  let url = `${API_BASE}/people`;
  if (hasPhoto !== null) {
    url += `?has_photo=${hasPhoto}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch people: ${res.status}`);
  return res.json();
}

export async function fetchRandomPeople(count = 5) {
  const res = await fetch(`${API_BASE}/people/random?count=${count}`);
  if (!res.ok) throw new Error(`Failed to fetch random people: ${res.status}`);
  return res.json();
}

export async function fetchPerson(slug) {
  const res = await fetch(`${API_BASE}/people/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch person: ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// --- Leaderboard endpoints ---

export async function saveRotation(slugs) {
  const res = await fetch(`${API_BASE}/rotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slugs }),
  });
  if (!res.ok) throw new Error(`Failed to save rotation: ${res.status}`);
  return res.json();
}

export async function voteOnRotation(tableHash, vote, voterToken) {
  const res = await fetch(`${API_BASE}/rotations/${tableHash}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote, voter_token: voterToken }),
  });
  if (res.status === 409) {
    const data = await res.json();
    throw Object.assign(new Error(data.detail), { status: 409 });
  }
  if (!res.ok) throw new Error(`Failed to vote: ${res.status}`);
  return res.json();
}

export async function fetchLeaderboard({ sortBy = 'score', seatCount = null, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ sort_by: sortBy, page, limit });
  if (seatCount) params.set('seat_count', seatCount);
  const res = await fetch(`${API_BASE}/leaderboard?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`);
  return res.json();
}

export async function fetchRotation(tableHash, voterToken = null) {
  let url = `${API_BASE}/rotations/${tableHash}`;
  if (voterToken) url += `?voter_token=${voterToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch rotation: ${res.status}`);
  return res.json();
}

/**
 * Compute the table hash client-side — mirrors the Python backend algorithm exactly.
 * sorted(slugs).join('|') -> SHA-256 -> first 12 hex chars
 * Returns a Promise<string> so the URL is known before any backend round-trip.
 */
export async function computeTableHash(slugs) {
  const canonical = [...slugs].sort().join('|');
  const msgBuffer = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 12);
}
