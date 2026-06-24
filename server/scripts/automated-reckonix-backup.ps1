<#
automated-reckonix-backup.ps1

Uploads the `create-reckonix-backup.sh` script to the EC2 instance, runs it
for Reckonix project paths (or defaults), downloads the generated backups to
a local folder, and verifies SHA256 checksums.

Usage (PowerShell):
  .\automated-reckonix-backup.ps1 -KeyPath 'C:\Users\lenovo\.ssh\ec2_ed25519' -Host '3.110.130.234' -LocalDir 'E:\reckonix-backup'

Requires: OpenSSH client installed (ssh/scp), `create-reckonix-backup.sh` present in this repo under `server\scripts`.

#>

param(
  [string]$KeyPath = 'C:\Users\lenovo\.ssh\ec2_ed25519',
  [string]$Host = '3.110.130.234',
  [string]$RemoteUser = 'ec2-user',
  [string]$LocalDir = 'E:\reckonix-backup',
  [string[]]$RemotePaths = @(),
  [switch]$UploadToS3,
  [string]$S3Bucket = ''
)

function Fail($msg){ Write-Error $msg; exit 1 }

if (-not (Test-Path $KeyPath)) { Fail "SSH key not found at $KeyPath" }

New-Item -Path $LocalDir -ItemType Directory -Force | Out-Null

$repoScript = Join-Path -Path $PSScriptRoot -ChildPath 'create-reckonix-backup.sh'
if (-not (Test-Path $repoScript)) { Fail "Missing create-reckonix-backup.sh in $($PSScriptRoot)" }

$remoteScript = '/tmp/create-reckonix-backup.sh'

Write-Output "Uploading backup script to $Host:$remoteScript"
scp -i $KeyPath $repoScript "$RemoteUser@$Host:$remoteScript" || Fail "scp upload failed"

Write-Output "Making remote script executable"
ssh -i $KeyPath "$RemoteUser@$Host" "chmod +x $remoteScript || true"

$remoteArgs = ''
if ($RemotePaths.Count -gt 0) { $remoteArgs = [string]::Join(' ', $RemotePaths) }

Write-Output "Running backup script on remote host (this may take a while)"
ssh -i $KeyPath "$RemoteUser@$Host" "sudo bash $remoteScript $remoteArgs" || Write-Warning "Remote script exited with non-zero code"

Write-Output "Listing generated files on remote host"
ssh -i $KeyPath "$RemoteUser@$Host" "ls -lh /tmp/reckonix-backups || true"

Write-Output "Downloading backups to $LocalDir"
scp -i $KeyPath -r "$RemoteUser@$Host:/tmp/reckonix-backups/*" $LocalDir\ 2>$null || Write-Warning "Some files may not have been downloaded via scp"

Write-Output "Verifying checksums locally"
$shaFiles = Get-ChildItem -Path $LocalDir -Filter "*.sha256" -ErrorAction SilentlyContinue
if ($shaFiles.Count -eq 0) { Write-Warning "No .sha256 checksum files found in $LocalDir" }

foreach ($sha in $shaFiles) {
  $content = Get-Content $sha.FullName -ErrorAction SilentlyContinue
  if ($content -match "^([0-9a-fA-F]{64})\s+(.+)$") {
    $expected = $matches[1]
    $filename = $matches[2]
    $localFile = Join-Path $LocalDir $filename
    if (Test-Path $localFile) {
      $h = Get-FileHash -Path $localFile -Algorithm SHA256
      if ($h.Hash.ToLower() -eq $expected.ToLower()) {
        Write-Output "OK: $filename"
      } else {
        Write-Warning "MISMATCH: $filename\n  expected: $expected\n  got:      $($h.Hash)"
      }
    } else { Write-Warning "Referenced file $filename not found locally" }
  } else { Write-Warning "Unrecognized sha256 file format: $($sha.Name)" }
}

if ($UploadToS3) {
  if ([string]::IsNullOrWhiteSpace($S3Bucket)) { Fail "S3 upload requested but no bucket provided" }
  Write-Output "Uploading backups to s3://$S3Bucket/"
  $files = Get-ChildItem -Path $LocalDir -File
  foreach ($f in $files) {
    Write-Output "aws s3 cp '$($f.FullName)' 's3://$S3Bucket/'"
    aws s3 cp "$($f.FullName)" "s3://$S3Bucket/" || Write-Warning "Failed to upload $($f.Name)"
  }
}

Write-Output "Done. Local backups are in: $LocalDir"
