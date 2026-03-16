# v0.1.10

Docker-native OpenClaw connector service for Mission Control.

- Added an `openclaw-connector` service to the production compose stack
- Added narrow `/health`, `/agents`, and `/dispatch` connector endpoints
- Updated Docker deployment guidance to use `http://openclaw-connector:18790` for Mission Control OpenClaw linkage
