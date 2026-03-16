# Mission Control v0.1.3

Installer retry follow-up release.

## Highlights

- installer now retries automatically if Docker reports that the app port is already allocated
- the selected fallback port is written into `.env` before retrying
- explicit `MC_APP_PORT` values still fail early and clearly when the port is occupied

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.3/scripts/bootstrap-public.sh | bash
```
