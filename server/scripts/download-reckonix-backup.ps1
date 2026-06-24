<#
download-reckonix-backup.ps1
Local PowerShell helper to download the backup tarball and checksum from the EC2 server.
Usage (PowerShell):
  .\download-reckonix-backup.ps1 -KeyPath 'C:\Users\lenovo\.ssh\ec2_ed25519' -Host '3.110.130.234' -LocalDir 'E:\reckonix-backup'
#>

param(
  [string]$KeyPath = "C:\Users\lenovo\.ssh\ec2_ed25519",
  [string]$RemoteUser = "ec2-user",
  [string]$Host = "3.110.130.234",
  [string]$RemotePath = "/tmp/reckonix-backups",
  [string]$LocalDir = "E:\reckonix-backup"
)

New-Item -Path $LocalDir -ItemType Directory -Force | Out-Null

$session = "$RemoteUser@$Host"

Write-Output "Listing remote backups (remote: $session:$RemotePath)"
ssh -i $KeyPath $session "ls -lh $RemotePath || true"

Write-Output "Copying latest tarball(s) and checksum(s) to $LocalDir"
scp -i $KeyPath $session:$RemotePath/reckonix-full-*.tar.gz $LocalDir\ 2>$null || Write-Output "No tar.gz found or scp failed"
scp -i $KeyPath $session:$RemotePath/reckonix-full-*.sha256 $LocalDir\ 2>$null || Write-Output "No sha256 found or scp failed"

Write-Output "Verifying checksums locally"
Get-ChildItem -Path $LocalDir -Filter "reckonix-full-*.tar.gz" | ForEach-Object {
  $file = $_.FullName
  $hash = Get-FileHash -Path $file -Algorithm SHA256
  Write-Output "$($_.Name): $($hash.Hash)"
}

Write-Output "Open the .sha256 files in $LocalDir and compare hashes above, or run the following to auto-compare:"
Write-Output "  Get-Content $LocalDir\\*.sha256"
