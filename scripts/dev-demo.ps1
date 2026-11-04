# Demo-API unter Windows (mit den PHP-Erweiterungen aus dev-api.ps1): Archiv erzeugen mit
#   python scripts/make_demo_archive.py
# Login aus, Schreibmodus an, Wegwerf-Daten in demo/data. Port 8083.
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root 'demo\data'
New-Item -ItemType Directory -Force -Path $data | Out-Null
$env:DATA_ROOT = Join-Path $root 'demo\archive'
$env:INDEX_DIR = $data
$env:AUTH = '0'
$env:READ_ONLY = '0'
$env:EXCLUDE = ''
$env:PDF_TEXT = '0'
$env:OCR_ENABLED = '0'
$env:CORS_ORIGIN = '*'
Set-Location (Join-Path $root 'api')
php -d extension=zip -d extension=fileinfo -d extension=exif -d memory_limit=512M -S 127.0.0.1:8083 index.php
