# v0.1.5

Launch workspace bootstrap follow-up.

- Production bootstrap now creates the same default workspace slug used by the app fallback
- Active workspace resolution now falls back to the first available workspace if no cookie-matched slug exists
- This fixes first launch for installs that could sign in but landed with no visible workspace
