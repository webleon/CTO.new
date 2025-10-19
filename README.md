# Nginx Proxy Manager Portal

A small Express web service that authenticates to Nginx Proxy Manager (NPM) and renders a simple directory of configured hosts with clickable links.

## Features
- Authenticates to NPM internal API using admin credentials
- Lists enabled Proxy Hosts; optionally includes Redirection Hosts and Streams
- Clickable domain links (https if SSL is forced, else http)
- Shows status, upstream scheme/host/port, and SSL flag
- Optional link to open the item in the NPM admin UI
- Periodically refreshes data from NPM
- Packaged with Docker and docker-compose

## Configuration
Configure the service via environment variables. Copy the example file and update values:

```bash
cp .env.example .env
# edit .env to match your environment
```

Environment variables:
- NPM_BASE_URL: Base URL for NPM admin/API (e.g., http://localhost:81)
- NPM_EMAIL: NPM admin email
- NPM_PASSWORD: NPM admin password
- INCLUDE_REDIRECTS: true/false (default false)
- INCLUDE_STREAMS: true/false (default false)
- REFRESH_INTERVAL_SECONDS: refresh interval (default 60)
- PORT: local port for this service (default 3000)

## Run locally
Using Node.js:

```bash
npm install
npm start
# open http://localhost:3000
```

Using Docker Compose:

```bash
docker compose up --build
# open http://localhost:3000
```

## Reverse proxy via NPM
You can expose this portal behind NPM itself:
1. In NPM, create a new Proxy Host
2. Domain Names: portal.localdomain
3. Scheme: http
4. Forward Hostname/IP: hostname or IP where this service runs
5. Forward Port: 3000
6. Enable Websockets (optional)
7. SSL: request a certificate if desired

After saving, navigate to the new domain (e.g., https://portal.localdomain).

## Minimal tests
Run the unit tests:

```bash
npm test
```

The tests cover the transformation from NPM API objects to the UI view model.

## Notes
- The service authenticates on startup and refreshes data periodically. If the token expires, it will re-authenticate automatically on demand.
- The NPM admin edit link for items will use the NPM_BASE_URL configured, pointing to paths like:
  - Proxy: /nginx/proxy/edit/:id
  - Redirection: /nginx/redirection/edit/:id
  - Stream: /nginx/stream/edit/:id

## Security
- Provide a dedicated low-privileged NPM account if possible.
- Do not expose this portal publicly unless protected by auth.

## Docker images (GHCR + optional Docker Hub)
A GitHub Actions workflow builds a multi-arch Docker image (linux/amd64 and linux/arm64) and publishes it to:
- GHCR: ghcr.io/<owner>/<repo>
- Optionally Docker Hub (when DOCKERHUB_USERNAME/DOCKERHUB_TOKEN secrets are configured): docker.io/<user>/<repo>

Tagging strategy:
- On push to main: latest, sha-<short>
- On tags vX.Y.Z: vX.Y.Z, X.Y, X, latest

Example pulls:
```bash
# GHCR
docker pull ghcr.io/<owner>/<repo>:latest
# Optional Docker Hub mirror
docker pull docker.io/<user>/<repo>:latest
```

### Pulling from GHCR on Synology Container Manager (DSM 7.x)
Public images:
1. Open Synology Container Manager.
2. Go to Image > Add > By URL (or From URL).
3. Enter the image: ghcr.io/<owner>/<repo>:<tag> (e.g., :latest).
4. Pull the image and run a container as needed.

Private images:
1. In GitHub, create a Personal Access Token (classic) with at least the read:packages scope (repo may be needed if the package is linked to a private repo).
2. In Synology: Container Manager > Settings > Registries (or Registry Credentials) > Add.
3. Server: ghcr.io; enable authentication and provide:
   - Username: your GitHub username
   - Password: the PAT created in step 1
4. Save. Then go to Image > Add > By URL and enter ghcr.io/<owner>/<repo>:<tag>. If prompted, select the saved registry credential.

CLI alternative (via SSH):
```bash
docker login ghcr.io -u <github-username> --password-stdin <<<'<your-ghcr-pat>'
docker pull ghcr.io/<owner>/<repo>:<tag>
```

Notes:
- To allow unauthenticated pulls, set the GHCR package visibility to Public in GitHub.
- Images are built for both amd64 and arm64 and run on Synology devices with x86_64 or ARM processors.
