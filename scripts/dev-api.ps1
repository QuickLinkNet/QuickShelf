# Startet die PHP-API lokal gegen das echte Archiv (nur lesend) – für die Entwicklung.
# Index und Cache landen ausserhalb des Archivs in .devdata/.
param(
  [string]$DataRoot = 'Y:\Archiv',
  [int]$Port = 8081,
  [string]$ReadOnly = '1',
  [string]$IndexName = ''
)
$root = Split-Path -Parent $PSScriptRoot
$dev = Join-Path $root ('.devdata' + $IndexName)
New-Item -ItemType Directory -Force -Path $dev | Out-Null
$env:DATA_ROOT = $DataRoot
$env:INDEX_DIR = $dev
$env:OCR_ENABLED = '0'
$env:PDF_TEXT = '0'
$env:READ_ONLY = $ReadOnly
$env:EXCLUDE = 'Keys'
$env:CORS_ORIGIN = '*'
Set-Location (Join-Path $root 'api')
php -d extension=zip -d extension=fileinfo -d extension=exif -d memory_limit=512M -d max_execution_time=120 -S "127.0.0.1:$Port" index.php
