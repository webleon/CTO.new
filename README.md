# Nginx Proxy Manager Portal

English | [简体中文](./README.zh-CN.md)

A small Express web service that authenticates to Nginx Proxy Manager (NPM) and renders a simple directory of configured hosts with clickable links.

Badges:

[![Version](https://img.shields.io/github/v/tag/webleon/cto-new?label=version)](https://github.com/webleon/cto-new/tags)
[![GHCR Image](https://img.shields.io/badge/GHCR-ghcr.io%2Fwebleon%2Fcto-new-555?logo=github)](https://ghcr.io/webleon/cto-new)
[![Docker Pulls](https://img.shields.io/docker/pulls/<user>/<repo>?logo=docker&label=Docker%20Hub%20pulls)](https://hub.docker.com/r/<user>/<repo>)

Note: The GHCR image is published at ghcr.io/webleon/cto-new.

## Overview
This service logs into your Nginx Proxy Manager admin API and shows a compact, read-only portal of your configured items. It’s useful as a quick landing page for your self-hosted apps and services.

## Features
- Authenticates to NPM internal API using admin credentials
- Lists enabled Proxy Hosts; optionally includes Redirection Hosts and Streams
- Clickable domain links (https if SSL is forced, else http)
- Shows status, upstream scheme/host/port, and SSL flag
- Optional link to open the item in the NPM admin UI
- Periodically refreshes data from NPM
- Packaged with Docker and docker-compose
- Optional HTTP Basic Auth for the portal UI (via env vars)

## Environment variables
You can configure the service via environment variables. Either set NPM_BASE_URL directly, or derive it from NPM_HOST and NPM_PORT.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| NPM_BASE_URL | Yes (or derived) | — | Base URL for NPM admin/API (e.g., http://npm.local:81). If not provided, the app derives it from NPM_HOST and NPM_PORT (http scheme). |
| NPM_HOST | No | — | Host used to derive NPM_BASE_URL when NPM_BASE_URL is not set. |
| NPM_PORT | No | — | Port used to derive NPM_BASE_URL when NPM_BASE_URL is not set. |
| NPM_EMAIL | Yes | — | NPM admin email. |
| NPM_PASSWORD | Yes | — | NPM admin password. |
| INCLUDE_REDIRECTS | No | false | Include Redirection Hosts in the portal. |
| INCLUDE_STREAMS | No | false | Include Streams (TCP/UDP) in the portal. |
| REFRESH_INTERVAL_SECONDS | No | 60 | Refresh interval for fetching NPM data. |
| PORT | No | 3000 | HTTP port the portal listens on. |
| BASIC_AUTH_USER | No | — | If set with BASIC_AUTH_PASS, enables HTTP Basic Auth for the portal. |
| BASIC_AUTH_PASS | No | — | Password for HTTP Basic Auth. |

Quick start with a local .env file:

```bash
cp .env.example .env
# Edit .env to match your environment
```

## Run locally
- Node.js:
  ```bash
  npm install
  npm start
  # open http://localhost:3000
  ```

- Docker Compose (recommended):
  ```bash
  docker compose up --build
  # open http://localhost:3000
  ```

## GHCR image and tags

```bash
# GHCR image reference
export IMAGE_GHCR=ghcr.io/webleon/cto-new

# Example pulls
# latest tag
docker pull ${IMAGE_GHCR}:latest
# specific release tag
docker pull ${IMAGE_GHCR}:vX.Y.Z
```

Public pull:
```bash
docker pull ghcr.io/webleon/cto-new:latest
```

Private pull:
1. Create a GitHub Personal Access Token (classic) with the read:packages scope (repo may be needed if the package is linked to a private repo).
2. Log in and pull:
   ```bash
   echo '<your-ghcr-pat>' | docker login ghcr.io -u <github-username> --password-stdin
   docker pull ${IMAGE_GHCR}:latest
   ```

### Synology DSM (Container Manager) – pulling from GHCR
- Public images (no auth):
  1. Open Container Manager > Image > Add > By URL.
  2. Enter the image: ghcr.io/webleon/cto-new:<tag> (e.g., :latest).
  3. Pull the image and run a container as needed.

- Private images (with credentials):
  1. In GitHub, create a PAT with read:packages.
  2. In Synology: Container Manager > Settings > Registries (or Registry Credentials) > Add.
  3. Server: ghcr.io; enable authentication and provide:
     - Username: your GitHub username
     - Password: the PAT created in step 1
  4. Save. Then go to Image > Add > By URL and enter ghcr.io/webleon/cto-new:<tag>. If prompted, select the saved registry credential.

- CLI alternative (via SSH):
  ```bash
  echo '<your-ghcr-pat>' | docker login ghcr.io -u <github-username> --password-stdin
  docker pull ${IMAGE_GHCR}:latest
  ```

## Run on Synology (UI and CLI)

- Using Synology UI:
  1. Container Manager > Image: ensure the image is pulled (see above).
  2. Container Manager > Container > Create from the pulled image.
  3. General Settings:
     - Container Name: npm-proxy-portal
     - Enable auto-restart
  4. Port Settings:
     - Local port 5300 -> Container port 3000 (TCP)
  5. Environment:
     - NPM_BASE_URL=http://<npm-host>:81 (or set NPM_HOST and NPM_PORT)
     - NPM_EMAIL, NPM_PASSWORD
     - INCLUDE_REDIRECTS, INCLUDE_STREAMS (optional)
     - REFRESH_INTERVAL_SECONDS (optional)
     - BASIC_AUTH_USER / BASIC_AUTH_PASS (optional)
  6. Volumes: none required.
  7. Review and apply.

- Using CLI on Synology (via SSH):
  ```bash
  export IMAGE_GHCR=ghcr.io/webleon/cto-new
  docker run -d \
    --name npm-proxy-portal \
    -p 5300:3000 \
    --restart unless-stopped \
    -e NPM_BASE_URL=http://<npm-host>:81 \
    -e NPM_EMAIL=admin@example.com \
    -e NPM_PASSWORD=changeme \
    -e INCLUDE_REDIRECTS=false \
    -e INCLUDE_STREAMS=false \
    -e REFRESH_INTERVAL_SECONDS=60 \
    -e BASIC_AUTH_USER=admin \
    -e BASIC_AUTH_PASS=strongpassword \
    ${IMAGE_GHCR}:latest
  ```

## Expose via Nginx Proxy Manager (NPM)
You can expose this portal behind NPM itself:
1. In NPM, create a new Proxy Host
2. Domain Names: portal.example.com
3. Scheme: http
4. Forward Hostname/IP: the Docker host running this service
5. Forward Port: 3000 (or 5300 if you mapped 5300:3000)
6. Enable Websockets (optional)
7. SSL: request a certificate if desired; optionally Force SSL

After saving, navigate to the domain (e.g., https://portal.example.com).

## Troubleshooting
- Authentication to NPM fails:
  - Ensure NPM_BASE_URL points to the admin UI host/port (often http://<npm-host>:81), not the public reverse proxy.
  - Verify NPM_EMAIL and NPM_PASSWORD; try logging into the NPM UI with the same credentials.
- No items appear:
  - The portal shows only enabled items; ensure the relevant entries are enabled in NPM.
  - If you expect redirects/streams, set INCLUDE_REDIRECTS/INCLUDE_STREAMS=true.
- GHCR pull errors:
  - For private images, make sure the PAT has read:packages scope and you are logged in to ghcr.io.
  - For public pulls, ensure the GHCR package visibility is set to Public.
- Architecture mismatch:
  - The image is built for linux/amd64 and linux/arm64. Ensure your Synology device matches one of these.
- Basic Auth prompts repeatedly:
  - Confirm BASIC_AUTH_USER and BASIC_AUTH_PASS values match what you enter in the browser.

## Development and testing
```bash
npm install
npm test
```

## License
MIT
