"""
Scrape jmail.world/person for email counts and descriptions.
The listing page shows: name, short role, email count, slug.
"""

import re
import requests
from bs4 import BeautifulSoup

JMAIL_BASE = "https://jmail.world"
JMAIL_PERSON_URL = "https://jmail.world/person"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _parse_email_count(text: str) -> int | None:
    """Extract email count from strings like '123 emails' or '1,069,343 emails'."""
    match = re.search(r'([\d,]+)\s*emails?', text, re.IGNORECASE)
    if match:
        return int(match.group(1).replace(",", ""))
    return None


def _slugify(name: str) -> str:
    """Turn a name into a URL slug: 'Bill Gates' -> 'bill-gates'."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug


def scrape_jmail_page(url: str) -> list[dict]:
    """Scrape a single page of the jmail person listing."""
    print(f"[jmail] Fetching {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    contacts = []

    # The page renders contact entries as links to /person/{slug}
    # Each entry contains: name, description, email count
    # Look for links that point to /person/...
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        if not href.startswith("/person/") and not href.startswith("https://jmail.world/person/"):
            continue
        # Extract slug from URL
        slug_match = re.search(r'/person/([a-z0-9-]+)(?:/|$)', href)
        if not slug_match:
            continue
        slug = slug_match.group(1)

        # Skip navigation/pagination links
        if slug in ("page", ""):
            continue

        # Get full text of the link element
        full_text = link.get_text(separator=" ", strip=True)
        if not full_text or len(full_text) < 3:
            continue

        # Parse the email count from the text
        email_count = _parse_email_count(full_text)

        # Try to extract the name (usually first part before the description)
        # Format: "person {Name} {Description} {N} emails"
        # Remove "person" prefix if present
        clean_text = re.sub(r'^person\s+', '', full_text, flags=re.IGNORECASE)

        # The name is everything before the first sentence that looks like a description
        # or before the email count
        name = None
        description = None

        # Try splitting on the email count
        if email_count:
            count_str = str(email_count)
            # Find where the count appears and take description before it
            parts = re.split(r'[\d,]+\s*emails?', clean_text, maxsplit=1, flags=re.IGNORECASE)
            if parts:
                pre_count = parts[0].strip()
                # The name is usually a proper-cased portion at the start
                # The description follows in smaller/different case
                # Heuristic: split on first lowercase word that follows a capitalized word
                # after at least 2 words
                words = pre_count.split()
                name_words = []
                desc_words = []
                hit_desc = False
                for i, w in enumerate(words):
                    if not hit_desc:
                        # Check if this looks like start of description
                        # (lowercase word after we have at least a first+last name)
                        if i >= 2 and w[0].islower() and not w.startswith("bin") \
                                and not w.startswith("de") and not w.startswith("van") \
                                and not w.startswith("von"):
                            hit_desc = True
                            desc_words.append(w)
                        # Also check for known description patterns
                        elif i >= 2 and w in ("Personal", "Epstein", "CEO", "Admin",
                                              "Gates", "Travel", "Household", "NY",
                                              "Former", "Head"):
                            hit_desc = True
                            desc_words.append(w)
                        else:
                            name_words.append(w)
                    else:
                        desc_words.append(w)

                name = " ".join(name_words) if name_words else pre_count
                description = " ".join(desc_words) if desc_words else None
        else:
            name = clean_text

        if not name or len(name) < 2:
            continue

        # Avoid duplicates
        if any(c["slug"] == slug for c in contacts):
            continue

        contacts.append({
            "name": name.strip(),
            "jmail_description": description,
            "email_count": email_count,
            "jmail_url": f"{JMAIL_BASE}/person/{slug}",
            "slug": slug,
        })

    return contacts


def scrape_jmail() -> list[dict]:
    """
    Scrape all pages of jmail.world/person.
    Returns list of contact dicts with keys:
        name, jmail_description, email_count, jmail_url, slug
    """
    all_contacts = []

    # Page 1
    page1 = scrape_jmail_page(JMAIL_PERSON_URL)
    all_contacts.extend(page1)

    # Try additional pages (the site has ~200 contacts across 2 pages)
    for page_num in range(2, 5):
        try:
            page_url = f"{JMAIL_PERSON_URL}?page={page_num}"
            page_contacts = scrape_jmail_page(page_url)
            if not page_contacts:
                # Try alternate pagination format
                page_url = f"{JMAIL_PERSON_URL}/page/{page_num}"
                page_contacts = scrape_jmail_page(page_url)
            if not page_contacts:
                break
            # Only add contacts we don't already have
            for c in page_contacts:
                if not any(existing["slug"] == c["slug"] for existing in all_contacts):
                    all_contacts.append(c)
        except Exception as e:
            print(f"[jmail] Page {page_num} failed: {e}")
            break

    print(f"[jmail] Scraped {len(all_contacts)} contacts from jmail.world")
    return all_contacts


# Hardcoded fallback data for the most notable people in case scraping fails
JMAIL_FALLBACK = [
    {"name": "Jeffrey Epstein", "slug": "jeffrey-epstein", "email_count": 1069343, "jmail_description": "Epstein alias accounts", "jmail_url": "https://jmail.world/person/jeffrey-epstein"},
    {"name": "Lesley Groff", "slug": "lesley-groff", "email_count": 230115, "jmail_description": "Personal assistant, NY office", "jmail_url": "https://jmail.world/person/lesley-groff"},
    {"name": "Karyna Shuliak", "slug": "karyna-shuliak", "email_count": 48933, "jmail_description": "Epstein's girlfriend until death", "jmail_url": "https://jmail.world/person/karyna-shuliak"},
    {"name": "Boris Nikolic", "slug": "boris-nikolic", "email_count": 21736, "jmail_description": "Gates advisor, will executor", "jmail_url": "https://jmail.world/person/boris-nikolic"},
    {"name": "Elon Musk", "slug": "elon-musk", "email_count": 395, "jmail_description": "CEO of Tesla and SpaceX", "jmail_url": "https://jmail.world/person/elon-musk"},
    {"name": "Ehud Barak", "slug": "ehud-barak", "email_count": None, "jmail_description": "Former Israeli PM", "jmail_url": "https://jmail.world/person/ehud-barak"},
    {"name": "Ghislaine Maxwell", "slug": "ghislaine-maxwell", "email_count": None, "jmail_description": "Epstein's associate", "jmail_url": "https://jmail.world/person/ghislaine-maxwell"},
    {"name": "Reid Hoffman", "slug": "reid-hoffman", "email_count": None, "jmail_description": "LinkedIn co-founder", "jmail_url": "https://jmail.world/person/reid-hoffman"},
    {"name": "Peter Thiel", "slug": "peter-thiel", "email_count": None, "jmail_description": "PayPal co-founder", "jmail_url": "https://jmail.world/person/peter-thiel"},
    {"name": "Larry Summers", "slug": "larry-summers", "email_count": None, "jmail_description": "Former US Treasury Secretary", "jmail_url": "https://jmail.world/person/larry-summers"},
    {"name": "Prince Andrew", "slug": "prince-andrew", "email_count": None, "jmail_description": "British royal", "jmail_url": "https://jmail.world/person/prince-andrew"},
    {"name": "Steve Bannon", "slug": "steve-bannon", "email_count": None, "jmail_description": "Political strategist", "jmail_url": "https://jmail.world/person/steve-bannon"},
    {"name": "Michael Wolff", "slug": "michael-wolff", "email_count": None, "jmail_description": "Journalist", "jmail_url": "https://jmail.world/person/michael-wolff"},
    {"name": "Bill Gates", "slug": "bill-gates", "email_count": 123, "jmail_description": "Microsoft co-founder and philanthropist", "jmail_url": "https://jmail.world/person/bill-gates"},
    {"name": "Noam Chomsky", "slug": "noam-chomsky", "email_count": None, "jmail_description": "Linguist and intellectual", "jmail_url": "https://jmail.world/person/noam-chomsky"},
    {"name": "Tom Pritzker", "slug": "tom-pritzker", "email_count": None, "jmail_description": "Businessman, Hyatt Hotels", "jmail_url": "https://jmail.world/person/tom-pritzker"},
    {"name": "Alan Dershowitz", "slug": "alan-dershowitz", "email_count": None, "jmail_description": "Lawyer", "jmail_url": "https://jmail.world/person/alan-dershowitz"},
    {"name": "Al Seckel", "slug": "al-seckel", "email_count": None, "jmail_description": "Writer and skeptic", "jmail_url": "https://jmail.world/person/al-seckel"},
    {"name": "Kimbal Musk", "slug": "kimbal-musk", "email_count": None, "jmail_description": "Businessman, Elon's brother", "jmail_url": "https://jmail.world/person/kimbal-musk"},
    {"name": "Deepak Chopra", "slug": "deepak-chopra", "email_count": None, "jmail_description": "New Age guru", "jmail_url": "https://jmail.world/person/deepak-chopra"},
    {"name": "Ken Starr", "slug": "ken-starr", "email_count": None, "jmail_description": "Lawyer, former solicitor general", "jmail_url": "https://jmail.world/person/ken-starr"},
    {"name": "Peter Attia", "slug": "peter-attia", "email_count": None, "jmail_description": "Physician and podcaster", "jmail_url": "https://jmail.world/person/peter-attia"},
    {"name": "Marvin Minsky", "slug": "marvin-minsky", "email_count": None, "jmail_description": "AI pioneer", "jmail_url": "https://jmail.world/person/marvin-minsky"},
    {"name": "Lawrence Krauss", "slug": "lawrence-krauss", "email_count": None, "jmail_description": "Cosmologist", "jmail_url": "https://jmail.world/person/lawrence-krauss"},
    {"name": "Jean-Luc Brunel", "slug": "jean-luc-brunel", "email_count": None, "jmail_description": "Model agent", "jmail_url": "https://jmail.world/person/jean-luc-brunel"},
    {"name": "Sarah Kellen", "slug": "sarah-kellen", "email_count": None, "jmail_description": "Epstein associate", "jmail_url": "https://jmail.world/person/sarah-kellen"},
    {"name": "Nadia Marcinkova", "slug": "nadia-marcinkova", "email_count": None, "jmail_description": "Epstein associate", "jmail_url": "https://jmail.world/person/nadia-marcinkova"},
    {"name": "Joscha Bach", "slug": "joscha-bach", "email_count": None, "jmail_description": "Cognitive scientist", "jmail_url": "https://jmail.world/person/joscha-bach"},
    {"name": "Peter Mandelson", "slug": "peter-mandelson", "email_count": None, "jmail_description": "British politician", "jmail_url": "https://jmail.world/person/peter-mandelson"},
    {"name": "Howard Lutnick", "slug": "howard-lutnick", "email_count": None, "jmail_description": "Cantor Fitzgerald CEO", "jmail_url": "https://jmail.world/person/howard-lutnick"},
    {"name": "Sultan Ahmed bin Sulayem", "slug": "sultan-bin-sulayem", "email_count": None, "jmail_description": "Emirati businessman", "jmail_url": "https://jmail.world/person/sultan-bin-sulayem"},
    {"name": "Joi Ito", "slug": "joi-ito", "email_count": None, "jmail_description": "Former MIT Media Lab director", "jmail_url": "https://jmail.world/person/joi-ito"},
    {"name": "Neri Oxman", "slug": "neri-oxman", "email_count": None, "jmail_description": "Designer and professor", "jmail_url": "https://jmail.world/person/neri-oxman"},
    {"name": "Seth Lloyd", "slug": "seth-lloyd", "email_count": None, "jmail_description": "Quantum computing researcher", "jmail_url": "https://jmail.world/person/seth-lloyd"},
]


if __name__ == "__main__":
    results = scrape_jmail()
    if not results:
        print("Live scrape returned nothing, showing fallback data:")
        results = JMAIL_FALLBACK
    for c in results[:10]:
        print(f"  {c['name']} | emails={c.get('email_count')} | {c.get('jmail_description', 'N/A')}")
    print(f"\nTotal: {len(results)} contacts")
