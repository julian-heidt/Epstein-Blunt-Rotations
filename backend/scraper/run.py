"""
Orchestrator: scrape both sources, merge, and seed MongoDB.
Run as: python -m scraper.run
"""

import os
import sys
from datetime import datetime, timezone

from pymongo import MongoClient

from scraper.wikipedia import scrape_wikipedia
from scraper.jmail import scrape_jmail, JMAIL_FALLBACK
from scraper.merge import merge_data


MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/evil_blunts")
FORCE_RESEED = os.environ.get("FORCE_RESEED", "false").lower() == "true"


def seed_database():
    """Run the full scrape + merge + insert pipeline."""
    print("=" * 60, flush=True)
    print("EVIL BLUNTS — Database Seeder", flush=True)
    print("=" * 60, flush=True)

    # Connect to MongoDB
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
    db = client[db_name]
    collection = db["people"]

    # Check if already seeded
    existing = collection.count_documents({})
    if existing > 0 and not FORCE_RESEED:
        print(f"Database already has {existing} documents. Skipping seed.")
        print("Set FORCE_RESEED=true to re-seed.")
        client.close()
        return

    # Step 1: Scrape Wikipedia
    print("\n--- Step 1: Scraping Wikipedia ---", flush=True)
    try:
        wiki_people = scrape_wikipedia()
    except Exception as e:
        import traceback
        print(f"[ERROR] Wikipedia scraping failed: {e}", flush=True)
        traceback.print_exc()
        wiki_people = []

    if not wiki_people:
        print("[FATAL] No Wikipedia data. Cannot proceed.", flush=True)
        client.close()
        sys.exit(1)

    # Step 2: Scrape jmail
    print("\n--- Step 2: Scraping jmail.world ---")
    try:
        jmail_contacts = scrape_jmail()
    except Exception as e:
        print(f"[WARN] jmail scraping failed: {e}")
        jmail_contacts = []

    if not jmail_contacts:
        print("[WARN] Using fallback jmail data")
        jmail_contacts = JMAIL_FALLBACK

    # Step 3: Merge
    print("\n--- Step 3: Merging data ---")
    merged = merge_data(wiki_people, jmail_contacts)
    print(f"Merged dataset: {len(merged)} people")

    # Add timestamp
    now = datetime.now(timezone.utc)
    for doc in merged:
        doc["created_at"] = now

    # Step 4: Insert into MongoDB
    print("\n--- Step 4: Seeding MongoDB ---")
    collection.drop()
    if merged:
        collection.insert_many(merged)
        collection.create_index("slug", unique=True)
        collection.create_index("has_photo")
        collection.create_index("section_letter")

    final_count = collection.count_documents({})
    with_photos = collection.count_documents({"has_photo": True})
    with_emails = collection.count_documents({"email_count": {"$ne": None}})

    print(f"\nSeed complete!")
    print(f"  Total people:     {final_count}")
    print(f"  With photos:      {with_photos}")
    print(f"  With email count: {with_emails}")
    print("=" * 60)

    client.close()


if __name__ == "__main__":
    seed_database()
