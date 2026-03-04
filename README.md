# Cursed Blunt Rotations 🔥💨

Ever wondered who you'd be stuck in a blunt rotation with if the guest list came straight from the Epstein files? No? Well, now you can find out anyway.

**Cursed Blunt Rotations** generates random round-table seating arrangements featuring people named in the Epstein files. Pick your table size (3–7 seats), hit randomize, and see who fate — and public court documents — has seated beside you.

## What It Does

- Pulls real names, photos, and descriptions from [Wikipedia](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files)
- Cross-references email counts from [jmail.world](https://jmail.world/person)
- Presents them in a round-table UI with a "YOU" seat — because you're always invited
- Click any seat to see the full bio, email activity, and source links

## Data Sources

All data is sourced from publicly available sites:

- **Wikipedia** — biographical info, photos, and article links for 150+ people
- **jmail.world** — email counts from the Epstein email corpus

## Deployment

Images are published to Docker Hub under [`jheidt04`](https://hub.docker.com/u/jheidt04):

- `jheidt04/cursedbluntrotations-backend:latest`
- `jheidt04/cursedbluntrotations-frontend:latest`

### Docker Swarm / Portainer

1. Build and push images (see [Development Guide](docs/development.md#building--pushing-images))
2. In Portainer, add a new stack via **Git Repository**, pointing to this repo
3. Set the required environment variables (`MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `ALLOWED_ORIGINS`)
4. Deploy — Portainer will pull the pre-built images from Docker Hub

> **Note:** Docker Swarm (`docker stack deploy`) does not support `build:` directives. Images must be built and pushed to the registry before deploying.

## Technical Docs

For developers and contributors:

- [Architecture & API](docs/architecture.md)
- [Scrapers & Troubleshooting](docs/scrapers.md)
- [Development Guide](docs/development.md)

## License & Attribution

[![CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).

Biographical content, descriptions, and images are sourced from [Wikipedia](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files) (CC BY-SA 4.0, Wikipedia contributors). Email corpus data is sourced from [jmail.world](https://jmail.world/person).
