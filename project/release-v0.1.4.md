# v0.1.4

Production install hardening follow-up.

- Fresh installs now isolate Docker state with `COMPOSE_PROJECT_NAME=missioncontrol`
- Release startup now bootstraps the owner-linked empty workspace after migrations
- This prevents fresh installs from inheriting stale `mission-control` Postgres volumes and launching into an empty-unusable database
