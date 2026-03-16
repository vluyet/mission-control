# Mission Control v0.1.2

Install-flow reliability follow-up release.

## Highlights

- public bootstrap now handles occupied ports better
- automatic fallback to the next free app port when `3000` is unavailable
- clearer install failure if an explicitly requested `MC_APP_PORT` is already taken

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/vluyet/mission-control/v0.1.2/scripts/bootstrap-public.sh | bash
```
