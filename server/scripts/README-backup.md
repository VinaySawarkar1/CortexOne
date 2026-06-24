# Backup helper scripts

Files added to `server/scripts`:

- `create-reckonix-backup.sh` — server-side shell script to produce DB dumps (mongodump/mysqldump/pg_dumpall if available), archive common application directories, and write a SHA256 checksum. Run on the EC2 instance (recommended with `sudo`).

- `download-reckonix-backup.ps1` — PowerShell script to download the generated tarball(s) and checksum(s) to a local Windows path and print SHA256 sums for comparison.

Quick steps


1) SSH to the EC2 instance and run the server script for Reckonix only.

Default (uses built-in Reckonix paths):

```bash
ssh -i "C:\Users\lenovo\.ssh\ec2_ed25519" ec2-user@3.110.130.234
sudo bash /home/ec2-user/server/scripts/create-reckonix-backup.sh
```

Custom paths (recommended if your Reckonix repo lives in different locations). Example:

```bash
sudo bash /home/ec2-user/server/scripts/create-reckonix-backup.sh /var/www/reckonix /home/ec2-user/reckonix /srv/reckonix
```

The script writes to `/tmp/reckonix-backups` and prints filenames.

2) On your Windows machine, run the downloader (PowerShell):

```powershell
.\download-reckonix-backup.ps1 -KeyPath 'C:\Users\lenovo\.ssh\ec2_ed25519' -Host '3.110.130.234' -LocalDir 'E:\reckonix-backup'
```

3) Verify checksums: the script prints local SHA256 values — compare them to the `.sha256` files that were copied.

Notes and safety

- For zero-downtime consistent DB export, prefer running `mongodump`/`mysqldump`/`pg_dump` (script attempts this if tools exist). If you need a byte-exact snapshot of database files, create an EBS snapshot or stop DB services before archiving.
- Edit `APP_DIRS` in `create-reckonix-backup.sh` to include any custom paths containing JSON or local files you require.
- If `scp` is slow or flaky for very large backups, consider uploading the tarball from the server to an S3 bucket and downloading from S3 instead.
