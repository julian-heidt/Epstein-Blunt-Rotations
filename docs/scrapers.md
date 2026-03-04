# Scraper Documentation

## Overview

The backend scraper pipeline runs once on container startup to populate MongoDB with data from two sources: Wikipedia and jmail.world. The orchestrator is `scraper/run.py`.

## Wikipedia Scraper (`scraper/wikipedia.py`)

Scrapes the [List of people named in the Epstein files](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files) Wikipedia page.

### Extracted Fields
- **name** — person's name from the `<h3>` heading
- **photo_url** — first significant image (`width > 50px`), upscaled to 400px
- **description** — concatenated paragraph text between headings
- **wikipedia_url** — link to the person's Wikipedia article
- **section_letter** — the alphabetical letter section (A–Z)

### How It Works

1. Fetches the Wikipedia page HTML
2. Finds `div.mw-parser-output` — selects the **largest** one (see [Troubleshooting](#wikipedia-multiple-content-divs) below)
3. Walks `<h2>` elements to identify letter sections (A, B, C, …)
4. Walks `<h3>` elements within each letter section for individual people
5. For each person, collects sibling content (paragraphs, images) until the next heading boundary
6. Handles both old (`<span class="mw-headline">`) and new (`<div class="mw-heading">` wrapper) Wikipedia HTML formats

### Key Helper Functions
- `_get_heading_text(h)` — extracts heading text from either format
- `_get_container(h)` — returns the sibling-traversal anchor (the `<div class="mw-heading">` wrapper if present, otherwise the heading itself)
- `_is_heading_boundary(el)` — identifies both raw headings and wrapper divs as section boundaries
- `_fix_image_url(src)` — normalizes Wikipedia image URLs to full HTTPS, upscales thumbnails
- `_clean_text(text)` — strips citation markers `[1]`, collapses whitespace

## jmail Scraper (`scraper/jmail.py`)

Scrapes [jmail.world/person](https://jmail.world/person) for email counts associated with people in the Epstein email corpus.

### Extracted Fields
- **name** — parsed from the link text
- **email_count** — number of emails (e.g., "1,069,343 emails")
- **jmail_url** — link to the person's jmail page
- **jmail_description** — short role/description text
- **slug** — URL slug for deduplication

### Pagination
Fetches pages 1–4 sequentially. Stops if a page returns no new contacts. Deduplicates by slug.

### Fallback Data
If the live scrape fails or returns nothing, a hardcoded `JMAIL_FALLBACK` list of ~34 notable contacts is used.

## Merge (`scraper/merge.py`)

Merges Wikipedia (primary) with jmail (enrichment) using a 4-pass matching strategy:

1. **Hardcoded aliases** — handles known mismatches (e.g., "Andrew Mountbatten-Windsor" ↔ "Prince Andrew")
2. **Exact slug match** — slugified Wikipedia name vs. jmail slug
3. **Normalized name** — lowercased, stripped of suffixes (Jr., III, etc.)
4. **Fuzzy match** — `thefuzz.fuzz.token_sort_ratio` with threshold ≥ 82

Wikipedia is the authoritative source. jmail enriches with `email_count`, `jmail_url`, and `jmail_description`.

## Orchestrator (`scraper/run.py`)

Runs the full pipeline:
1. Check if MongoDB is already seeded (skip if so, unless `FORCE_RESEED=true`)
2. Scrape Wikipedia → fatal exit if 0 results
3. Scrape jmail → fall back to hardcoded data if 0 results
4. Merge data
5. Insert into MongoDB with indexes

## Troubleshooting

### Wikipedia: Multiple Content Divs

**Problem**: The Wikipedia page contains multiple `div.mw-parser-output` elements. The first is a small (~584 bytes) protection badge icon, not the article content. Using `soup.find()` returns this tiny div, resulting in 0 people scraped.

**Solution**: Use `soup.find_all("div", {"class": "mw-parser-output"})` and select the largest div by encoded content size:
```python
candidates = soup.find_all("div", {"class": "mw-parser-output"})
content = max(candidates, key=lambda d: len(d.encode_contents()))
```

### Wikipedia: Heading Format Changes

**Problem**: Wikipedia migrated from `<h2><span class="mw-headline">Text</span></h2>` to `<div class="mw-heading mw-heading2"><h2>Text</h2></div>`. This changes both text extraction and sibling traversal.

**Solution**: 
- `_get_heading_text()` tries `span.mw-headline` first, falls back to direct text extraction
- `_get_container()` checks if the heading is wrapped in a `div.mw-heading` and traverses siblings from the wrapper instead
- `_is_heading_boundary()` recognizes both raw headings and wrapper divs

### Buffered Output in Docker

**Problem**: Python output doesn't appear in `docker compose logs` in real time.

**Solution**: Set `PYTHONUNBUFFERED=1` in the container environment (already configured in `docker-compose.yml`).

### jmail: JavaScript-Rendered Content

If jmail.world changes to client-side rendering, the scraper may return 0 contacts. The `JMAIL_FALLBACK` list in `jmail.py` provides a safety net with ~34 notable contacts.
