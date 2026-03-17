# Release v0.1.11

## Summary

This release stabilizes Mission Control ↔ OpenClaw integration on `piclaw` by adopting the working runtime topology:

- Mission Control app on host (`mission-control-app.service`)
- PostgreSQL in Docker
- OpenClaw on host
- Host bridge on `127.0.0.1:18891` (`mc-openclaw-host-bridge.service`)

## Included changes

- Host bridge service and script
- Host-run app deployment path
- OpenClaw connector detection for bridge URLs on port `18891`
- Updated production documentation
