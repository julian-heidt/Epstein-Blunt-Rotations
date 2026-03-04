"""
Merge Wikipedia and jmail data using fuzzy name matching.
Wikipedia is the primary source (notable people with descriptions + photos).
jmail enriches with email counts.
"""

import re
from thefuzz import fuzz

# Hardcoded aliases for known mismatches between the two sources
ALIASES = {
    "Andrew Mountbatten-Windsor": ["Prince Andrew", "prince-andrew"],
    "Lawrence H. Summers": ["Larry Summers", "larry-summers"],
    "Larry Summers": ["Larry Summers", "larry-summers"],
    "Jean-Luc Brunel": ["Jean Luc Brunel", "jean-luc-brunel"],
    "Nadia Marcinko": ["Nadia Marcinkova", "nadia-marcinkova"],
    "Sultan Ahmed bin Sulayem": ["Sultan Bin Sulayem", "sultan-bin-sulayem"],
    "Børge Brende": ["Borge Brende", "borge-brende"],
    "Thorbjørn Jagland": ["Thorbjorn Jagland", "thorbjorn-jagland"],
    "Miroslav Lajčák": ["Miroslav Lajcak", "miroslav-lajcak"],
    "Tsakhiagiin Elbegdorj": ["Elbegdorj", "elbegdorj"],
    "Andrés Pastrana Arango": ["Andres Pastrana", "andres-pastrana"],
    "Mette-Marit, Crown Princess of Norway": ["Mette-Marit", "mette-marit"],
    "Donald Trump Jr. and Eric Trump": ["Donald Trump Jr", "donald-trump-jr"],
    "Kathryn Ruemmler": ["Kathy Ruemmler", "kathy-ruemmler"],
    "Jes Staley": ["Jes Staley", "jes-staley"],
    "V.S. Ramachandran": ["VS Ramachandran", "vs-ramachandran"],
    "Stephen Hawking": ["Stephen Hawking", "stephen-hawking"],
    "Flavio Briatore": ["Flavio Briatore", "flavio-briatore"],
    "Princess Sofia, Duchess of Värmland": ["Princess Sofia", "princess-sofia"],
}


def _slugify(name: str) -> str:
    """Create a URL-safe slug from a name."""
    slug = name.lower().strip()
    # Replace special chars
    slug = slug.replace("ø", "o").replace("æ", "ae").replace("å", "a")
    slug = slug.replace("č", "c").replace("á", "a").replace("é", "e")
    slug = slug.replace("í", "i").replace("ó", "o").replace("ú", "u")
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug


def _normalize(name: str) -> str:
    """Normalize a name for comparison."""
    n = name.lower().strip()
    # Remove common prefixes/suffixes
    n = re.sub(r'\b(jr\.?|sr\.?|iii?|iv)\b', '', n)
    n = re.sub(r'[^a-z\s]', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n


def merge_data(wiki_people: list[dict], jmail_contacts: list[dict]) -> list[dict]:
    """
    Merge Wikipedia people with jmail contacts via fuzzy matching.
    Returns enriched list of person documents ready for MongoDB.
    """
    # Build a lookup from jmail by normalized name and slug
    jmail_by_name = {}
    jmail_by_slug = {}
    for c in jmail_contacts:
        norm = _normalize(c["name"])
        jmail_by_name[norm] = c
        jmail_by_slug[c["slug"]] = c

    merged = []
    matched_count = 0

    for person in wiki_people:
        name = person["name"]
        slug = _slugify(name)

        # Try to find jmail match
        jmail_match = None

        # 1. Check hardcoded aliases first
        if name in ALIASES:
            alias_name, alias_slug = ALIASES[name]
            jmail_match = jmail_by_slug.get(alias_slug)
            if not jmail_match:
                jmail_match = jmail_by_name.get(_normalize(alias_name))

        # 2. Try exact slug match
        if not jmail_match:
            jmail_match = jmail_by_slug.get(slug)

        # 3. Try normalized name match
        if not jmail_match:
            norm = _normalize(name)
            jmail_match = jmail_by_name.get(norm)

        # 4. Try fuzzy matching
        if not jmail_match:
            best_score = 0
            best_match = None
            norm = _normalize(name)
            for jname, jcontact in jmail_by_name.items():
                score = fuzz.token_sort_ratio(norm, jname)
                if score > best_score:
                    best_score = score
                    best_match = jcontact
            if best_score >= 82:
                jmail_match = best_match

        # Build merged document
        doc = {
            "name": name,
            "slug": slug,
            "wikipedia_url": person.get("wikipedia_url"),
            "photo_url": person.get("photo_url"),
            "description": person.get("description", ""),
            "section_letter": person.get("section_letter"),
            "has_photo": person.get("has_photo", False),
            "email_count": None,
            "jmail_url": None,
            "jmail_description": None,
        }

        if jmail_match:
            matched_count += 1
            doc["email_count"] = jmail_match.get("email_count")
            doc["jmail_url"] = jmail_match.get("jmail_url")
            doc["jmail_description"] = jmail_match.get("jmail_description")
            # Use jmail slug if available (more reliable for URL construction)
            if jmail_match.get("slug"):
                doc["jmail_url"] = f"https://jmail.world/person/{jmail_match['slug']}"

        merged.append(doc)

    print(f"[merge] Matched {matched_count}/{len(wiki_people)} Wikipedia people to jmail contacts")
    return merged


if __name__ == "__main__":
    # Quick test
    from scraper.wikipedia import scrape_wikipedia
    from scraper.jmail import scrape_jmail, JMAIL_FALLBACK

    wiki = scrape_wikipedia()
    jmail = scrape_jmail()
    if not jmail:
        jmail = JMAIL_FALLBACK
    result = merge_data(wiki, jmail)
    for p in result[:10]:
        print(f"  {p['name']}: emails={p['email_count']}, photo={'yes' if p['has_photo'] else 'no'}")
