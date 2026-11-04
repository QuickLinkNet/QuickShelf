# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private
"Report a vulnerability" button (Security tab → Advisories) of this repository.
Describe what you found, how to reproduce it and which version you tested. You will get an answer within a few days.

## Running it safely

- Expose the cockpit to the internet only over **HTTPS** (reverse proxy, VPN or tunnel).
- Set the password right after uploading – the first visitor to the setup wizard chooses it.
- Keep `READ_ONLY=1` (default) unless you need the sort-inbox feature.
- Make sure `api/data/` is not reachable from the web (the cockpit checks this after login and warns you; nginx needs the rule from the README).
- Keep PHP up to date.

## Supported versions

Only the latest release receives fixes.
