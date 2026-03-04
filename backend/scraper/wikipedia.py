"""
Scrape the Wikipedia page for people named in the Epstein files.
Extracts: name, photo URL, description, Wikipedia article URL, section letter.
"""

import re
import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files"

HEADERS = {
    "User-Agent": "EvilBlunts/1.0 (Educational project; contact@example.com)"
}


def _fix_image_url(src: str) -> str | None:
    """Convert a Wikipedia thumbnail src to a usable HTTPS URL."""
    if not src:
        return None
    if src.startswith("//"):
        src = "https:" + src
    elif src.startswith("/"):
        src = "https://en.wikipedia.org" + src
    # Upscale thumbnail: replace width parameter
    src = re.sub(r'/(\d+)px-', '/400px-', src)
    return src


def _clean_text(text: str) -> str:
    """Clean up extracted text: collapse whitespace, strip citation numbers."""
    text = re.sub(r'\[\d+\]', '', text)  # remove [1], [23], etc.
    text = re.sub(r'\[citation needed\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def scrape_wikipedia() -> list[dict]:
    """
    Scrape the Wikipedia Epstein files list page.
    Returns a list of person dicts with keys:
        name, photo_url, description, wikipedia_url, section_letter, has_photo
    """
    print("[wiki] Fetching Wikipedia page...", flush=True)
    resp = requests.get(WIKI_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    print(f"[wiki] HTTP {resp.status_code}, response length: {len(resp.text)} chars", flush=True)

    soup = BeautifulSoup(resp.text, "lxml")
    people = []

    # Find the main content area — there may be multiple mw-parser-output divs;
    # the first one is often a small protection badge. Find the largest one.
    candidates = soup.find_all("div", {"class": "mw-parser-output"})
    if not candidates:
        print("[wiki] ERROR: Could not find any mw-parser-output div", flush=True)
        return []

    content = max(candidates, key=lambda d: len(d.encode_contents()))
    print(f"[wiki] Selected content div ({len(content.encode_contents())} bytes)", flush=True)

    current_letter = None

    def _get_heading_text(h) -> str:
        """Extract heading text, handling both old and new Wikipedia HTML."""
        # Old format: <h2><span class="mw-headline">Text</span></h2>
        span = h.find("span", {"class": "mw-headline"})
        if span:
            return span.get_text(strip=True)
        # New format (2024+): heading text directly in h2/h3
        # But we need to exclude any edit-section text
        # Remove mw-editsection spans before getting text
        for edit_span in h.find_all("span", {"class": "mw-editsection"}):
            edit_span.decompose()
        return h.get_text(strip=True)

    def _get_container(h):
        """Get the element whose siblings contain the section content.
        New Wikipedia wraps headings in <div class='mw-heading'> divs,
        so the actual content paragraphs are siblings of the wrapper div,
        not siblings of the h2/h3 itself."""
        parent = h.parent
        if parent and parent.name == "div" and "mw-heading" in (parent.get("class") or []):
            return parent
        return h

    def _is_heading_boundary(el) -> bool:
        """Check if an element is a heading or a heading wrapper div."""
        if el.name in ("h2", "h3"):
            return True
        if el.name == "div" and "mw-heading" in (el.get("class") or []):
            return True
        return False

    # Walk through all headings in order
    for heading in content.find_all(["h2", "h3"]):
        # h2 = letter sections (A, B, C, ...)
        if heading.name == "h2":
            letter = _get_heading_text(heading)
            if len(letter) == 1 and letter.isalpha():
                current_letter = letter
            continue

        # h3 = person entries
        if heading.name == "h3":
            if not current_letter:
                continue

            name = _clean_text(_get_heading_text(heading))
            if not name or name.lower() in ("references", "notes", "further reading",
                                             "external links", "see also"):
                continue

            # Get Wikipedia article URL from first link in heading
            wikipedia_url = None
            first_link = heading.find("a")
            if first_link and first_link.get("href", "").startswith("/wiki/"):
                wikipedia_url = "https://en.wikipedia.org" + first_link["href"]

            # Collect content between this h3 and the next heading
            # Use the container (wrapper div or heading itself) for sibling traversal
            container = _get_container(heading)
            photo_url = None
            description_parts = []

            sibling = container.find_next_sibling()
            while sibling and not _is_heading_boundary(sibling):
                # Look for images
                if not photo_url:
                    img = sibling.find("img") if hasattr(sibling, 'find') else None
                    if img:
                        src = img.get("src", "")
                        # Skip tiny icons and logos
                        if "wiki" in src.lower() or "upload" in src.lower():
                            width = img.get("width")
                            if width and int(width) > 50:
                                photo_url = _fix_image_url(src)
                        elif not src.startswith("data:"):
                            photo_url = _fix_image_url(src)

                # Collect paragraph text
                if sibling.name == "p":
                    text = _clean_text(sibling.get_text())
                    if text:
                        description_parts.append(text)

                sibling = sibling.find_next_sibling()

            description = " ".join(description_parts)

            # Skip entries with no meaningful description
            if len(description) < 20:
                continue

            people.append({
                "name": name,
                "photo_url": photo_url,
                "description": description,
                "wikipedia_url": wikipedia_url,
                "section_letter": current_letter,
                "has_photo": photo_url is not None,
            })

    print(f"[wiki] Scraped {len(people)} people from Wikipedia", flush=True)
    return people


if __name__ == "__main__":
    results = scrape_wikipedia()
    for p in results[:5]:
        print(f"  {p['name']} | photo={'yes' if p['has_photo'] else 'no'} | {p['description'][:80]}...")
    print(f"\nTotal: {len(results)} people")
    print(f"With photos: {sum(1 for p in results if p['has_photo'])}")
