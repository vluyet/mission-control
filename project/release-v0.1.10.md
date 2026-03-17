# v0.1.10

Docker-native OpenClaw connector service for Mission Control using host networking for the connector only.

- Added an `openclaw-connector` service to the production compose stack using host networking so it can reach a loopback-bound OpenClaw gateway
- Added narrow `/health`, `/agents`, and `/dispatch` connector endpoints
- Updated Docker deployment guidance to use `http://host.docker.internal:18890` for Mission Control OpenClaw linkage
