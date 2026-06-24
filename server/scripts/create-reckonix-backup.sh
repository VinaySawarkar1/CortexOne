#!/bin/bash
set -euo pipefail

# create-reckonix-backup.sh
# Server-side helper to produce DB dumps and a tarball of Reckonix app dirs.
# Usage: sudo bash create-reckonix-backup.sh [path1 path2 ...]
# If you pass paths they will be archived; otherwise defaults target common reckionix locations.

OUTDIR=/tmp/reckonix-backups
mkdir -p "$OUTDIR"
DATE=$(date +%F-%H%M%S)

echo "Creating backup in $OUTDIR (timestamp $DATE)"

# 1) DB dumps (best-effort; will not fail whole script if command missing)
if command -v mongodump >/dev/null 2>&1; then
  echo "Found mongodump — creating MongoDB dump"
  mongodump --out "$OUTDIR/mongodump-$DATE" || echo "mongodump failed or partial"
fi

if command -v mysqldump >/dev/null 2>&1; then
  echo "Found mysqldump — creating MySQL dump"
  sudo mysqldump --all-databases --single-transaction --quick --lock-tables=false > "$OUTDIR/mysqldump-$DATE.sql" || echo "mysqldump failed or partial"
fi

if command -v pg_dumpall >/dev/null 2>&1; then
  echo "Found pg_dumpall — creating Postgres dump"
  sudo -u postgres pg_dumpall > "$OUTDIR/pgdump-$DATE.sql" || echo "pg_dumpall failed or partial"
fi


# 2) Application files and JSON/local data
# If the script is called with arguments, use those as paths to archive. Otherwise use sensible defaults
if [ "$#" -gt 0 ]; then
  APP_DIRS=()
  for p in "$@"; do
    APP_DIRS+=("$p")
  done
else
  # Defaults: adjust these to match where Reckonix projects live on your server
  APP_DIRS=(/home/ec2-user/reckonix /var/www/reckonix /opt/reckonix /srv/reckonix /home/ec2-user/reckonix-legacy)
fi

TARFILE="$OUTDIR/reckonix-full-$DATE.tar.gz"

echo "Archiving app directories to $TARFILE"
for d in "${APP_DIRS[@]}"; do
  if [ ! -e "$d" ]; then
    echo "Warning: path $d does not exist, skipping"
  fi
done

sudo tar --one-file-system -cpzf "$TARFILE" \
  --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/tmp --exclude="$OUTDIR" \
  "${APP_DIRS[@]}" || echo "tar completed with warnings"

# 3) checksum
echo "Creating checksum"
sha256sum "$TARFILE" > "$TARFILE.sha256" || true

echo "Done. Files created in $OUTDIR:"
ls -lh "$OUTDIR" || true

echo "Note: Review APP_DIRS in this script and rerun with sudo if needed."
