const API_BASE = '/api';

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
