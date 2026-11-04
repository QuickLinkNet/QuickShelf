# Schreibmodus-Test: Wegwerf-Archiv unter .devdata-test/archive, API auf Port 8082 (READ_ONLY=0).
# Archiv anlegen: python scripts/make_test_archive.py
$root = Split-Path -Parent $PSScriptRoot
$archive = Join-Path (Join-Path $root '.devdata-test') 'archive'
& (Join-Path $PSScriptRoot 'dev-api.ps1') -DataRoot $archive -Port 8082 -ReadOnly '0' -IndexName '-test'
