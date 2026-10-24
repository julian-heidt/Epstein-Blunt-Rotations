# Evil Blunts 🔥💨

Smoke seshes from the Epstein files.

Ever wondered who you'd be stuck in a blunt rotation with if the guest list came straight from the Epstein files? No? Well, now you can find out anyway.

**Live Demo** https://evilblunts.org

**Evil Blunts** generates random round-table seating arrangements featuring people named in the Epstein files. Pick your table size (3–7 seats), hit randomize, and see who fate — and public court documents — has seated beside Epstein.

## What It Does

- Pulls real names, photos, and descriptions from [Wikipedia](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files)
- Cross-references email counts from [jmail.world](https://jmail.world/person)
- Presents them in a round-table UI with Jeffrey Epstein at the head — because he's always hosting
- Click any seat to see the full bio, email activity, and source links

## Data Sources

All data is sourced from publicly available sites:

- **Wikipedia** — biographical info, photos, and article links for 150+ people
- **jmail.world** — email counts from the Epstein email corpus

## Deployment

GitHub Actions builds both images on every push to `main` that touches `backend/`, `frontend/` or the workflow itself (`.github/workflows/build.yml`) and pushes them to the GitHub Container Registry:

- `ghcr.io/julian-heidt/evilblunts-backend:latest` (also tagged `sha-<short commit>`)
- `ghcr.io/julian-heidt/evilblunts-frontend:latest` (also tagged `sha-<short commit>`)

Pull requests that touch those paths build both images without pushing. Docs-only commits do not trigger a build. Any change under `backend/` or `frontend/` rebuilds and redeploys both services, because the image labels carry the commit sha and a new digest always results. The stack file normally references `latest`. The `sha-` tags let you pin a broken `latest` back to a good build, as described under "When latest is broken".

### GitHub side

- Both packages are **private**. GitHub makes a new container package private on first publish; leave it that way. The repo itself is public, so this protects only the built artifacts, not the Dockerfiles or source. The cost is a long-lived PAT in Portainer that can read every private package on the account. Container registry storage is free for now, and GitHub says it will announce any change at least a month ahead. If that changes, old `sha-` tags need cleanup.
- The workflow logs in with the built-in `GITHUB_TOKEN` (`permissions: packages: write`), so the repo needs no Actions secret.
- The Swarm pulls with a classic personal access token named `portainer-ghcr-pull` that has only the `read:packages` scope. It lives only in Portainer, as the password of the registry entry `ghcr-julian-heidt`. Never commit it and never store it as an Actions secret.

### Portainer stack settings

Cutover order for the existing stack: add the `ghcr-julian-heidt` registry in Portainer, merge the PR, wait for the first `main` Build to go green, then update the stack to the settings below and turn **GitOps updates** on. A redeploy before the images exist fails to pull, rolls back to the previous images and retries on the next poll.

| Setting | Value |
|---|---|
| Registry (Registries page) | Custom registry named `ghcr-julian-heidt`, URL `ghcr.io`, authentication on, username `julian-heidt`, password the `portainer-ghcr-pull` token above, with access granted to the Swarm environment |
| Build method | Git Repository |
| Repository URL | `https://github.com/julian-heidt/Epstein-Blunt-Rotations` |
| Repository reference | `refs/heads/main` |
| Compose path | `docker-compose.yml` |
| Authentication | off. The repo is public, so no Git credential is needed |
| GitOps updates | on, mechanism **Polling**, fetch interval `10m` |
| Re-pull image | on |
| Force redeployment | on |
| Environment variables | `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `ALLOWED_ORIGINS` |
| Stack name | `ebr`. If the live stack has another name, update that stack instead of creating a new one, and use its name wherever `ebr` or `ebr_` appears below, including the `docker stack deploy` argument. |

With **Re-pull image** and **Force redeployment** on, Portainer redeploys the stack every interval and Swarm swaps in whichever `latest` digest is current. Every service has a healthcheck plus `update_config` with `failure_action: rollback`, so an image that never turns healthy rolls back to the previous digest. Check `docker service ps ebr_backend` on a manager rather than trusting the Portainer stack status.

Mongo has a placement risk under GitOps. It runs the floating `mongo:7.0` tag from Docker Hub, so with **Re-pull image** on, an upstream rebuild of that tag replaces the mongo task on the next poll, and the update is stop-first. The data volume is a local Docker volume, and `node.labels.avx == true` matches three nodes. If Swarm places the new task on a different avx node, mongo can start on an empty volume, pass its healthcheck, count as a successful update and trigger no rollback. The site then serves an empty database until the backend restarts and reseeds, and a reseed restores only the scraped `people` collection. To recover, turn **GitOps updates** off and find the node that held the data. `docker volume ls` does not show it, because the rescheduled task creates `ebr_mongo_data` on its new node too. Read the node of the Shutdown task from before the move in `docker service ps ebr_mongo --no-trunc`, or compare volume sizes with `docker system df -v` on each avx node. Then pin mongo there with `docker service update --constraint-add node.hostname==<node> ebr_mongo`. Saved rotations and votes (the `rotations` and `votes` collections) exist only on that old volume, and any saved while mongo ran on the empty volume stay on the new node's volume after you pin mongo back. The pin lasts only while GitOps updates stay off, because the next forced redeploy restores the placement from the stack file. A permanent fix is the same constraint in `docker-compose.yml`, or a digest-pinned `mongo:7.0.x@sha256:...` image so that **Re-pull image** never changes mongo's task spec.

A brand-new stack (not the cutover of the existing stack) starts from an empty volume and cold image caches, and Swarm has no `depends_on`. The backend runs the scraper first, and the scraper exits non-zero when mongo is unreachable after 10 seconds. The backend restart policy stops after 5 attempts 5 seconds apart, so a slow mongo image pull or first initialization can leave `ebr_backend` with only failed tasks. If `docker service ps ebr_backend` shows that once mongo is healthy, run `docker service update --force ebr_backend` on a manager.

### When latest is broken

Rollback keeps the old task running, but it does not stop the loop. The stored compose still says `latest`, so every poll re-resolves the same broken digest and the update fails again. For `backend` and `frontend` (start-first) that is churn. `mongo` runs `mongo:7.0` from Docker Hub, so a broken GHCR `latest` never touches it. It enters the same loop only if a new upstream `mongo:7.0` build fails its healthcheck. Then each stop-first attempt takes the database down for about the monitor period, and retagging a GHCR image does nothing for it.

For `backend` or `frontend`, recover in this order:

1. Pin the previous build. Change `image:` for the service in `docker-compose.yml` to `ghcr.io/julian-heidt/evilblunts-backend:sha-<good>` (or `evilblunts-frontend`), commit to `main`, and let Portainer's polling redeploy it. Revert the pin once a fixed `latest` exists.
2. Re-run the **Build** run for the `<good>` commit from step 1 in the Actions tab. That is the last run whose image worked, not simply the newest green run. The re-run rebuilds that commit instead of copying the old image, republishes it as `latest` and needs no token. GitHub allows a re-run only within 30 days of the original run. `frontend/package-lock.json` pins the JavaScript dependencies and `npm ci` installs exactly those. `backend/requirements.txt` pins only the direct Python dependencies, so a backend rebuild can still pull different transitive versions or reuse a cached layer that holds the broken ones. Use step 1 when a dependency is the suspected cause.
3. Retag from a workstation: `docker buildx imagetools create -t ghcr.io/julian-heidt/evilblunts-backend:latest ghcr.io/julian-heidt/evilblunts-backend:sha-<good>` (same for the frontend). The workstation must be logged in to `ghcr.io` with a token that has `write:packages`, which the Portainer pull token does not have.

A direct `docker service update` on a manager does not last, because the next poll undoes it while **Force redeployment** is on. A green Build run does not prove the image works, because the workflow builds the images but never starts them. For `mongo`, turn the stack's **GitOps updates** off in Portainer while debugging, then back on, or pin it to a known-good `7.0.x` tag or digest.

### Deploying by hand

The manager needs a GHCR login first, or `--with-registry-auth` sends no credentials. `docker login` prompts for a classic PAT with `read:packages`, and the PAT never goes on the command line. Portainer does not show the stored `portainer-ghcr-pull` value, so keep that value in a password manager, or create a short-lived `read:packages` token for the manual deploy:

```bash
docker login ghcr.io -u julian-heidt
export MONGO_ROOT_USERNAME=... MONGO_ROOT_PASSWORD=... ALLOWED_ORIGINS=...
docker stack deploy --with-registry-auth -c docker-compose.yml ebr
```

> **Note:** Docker Swarm (`docker stack deploy`) does not support `build:` directives. Images must be built and pushed to the registry before deploying; the workflow does that.

## Technical Docs

For developers and contributors:

- [Architecture & API](docs/architecture.md)
- [Scrapers & Troubleshooting](docs/scrapers.md)
- [Development Guide](docs/development.md)

## License & Attribution

[![CC BY-SA 4.0](https://licensebuttons.net/l/by-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-sa/4.0/)

This project is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).

Biographical content, descriptions, and images are sourced from [Wikipedia](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files) (CC BY-SA 4.0, Wikipedia contributors). Email corpus data is sourced from [jmail.world](https://jmail.world/person).
