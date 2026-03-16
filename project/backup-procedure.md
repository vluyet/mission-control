# Database Backup Procedure

This project must be operated through Docker only.

## Create a backup

Run from the repository root:

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backups/mission-control-$(date +%F-%H%M%S).sql
```

Notes:
- `-T` disables pseudo-TTY output so the SQL dump stays clean.
- The backup is a plain PostgreSQL SQL dump.
- Store backups outside the container so they survive rebuilds.

## Restore a backup

1. Reset the target database if needed:

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

2. Restore from a backup file:

```bash
cat backups/mission-control-YYYY-MM-DD-HHMMSS.sql | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

3. Reapply the application seed only if you intentionally want a clean empty app instead of the restored dump:

```bash
docker compose exec app npm run db:reset
```

## Recommended workflow

- Create a backup before destructive migration or bulk data changes.
- Keep at least one recent backup outside the working tree.
- Prefer restoring into a disposable local database first when validating a backup.
