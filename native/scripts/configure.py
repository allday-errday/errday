#!/usr/bin/env python3
"""Copy only public Supabase client configuration from the existing local env file."""
import base64
import json
import os
from pathlib import Path
import plistlib
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
values = {}
source = root.parent / ".env.local"
if source.exists():
    for line in source.read_text().splitlines():
        key, separator, value = line.strip().partition("=")
        if separator and key in {"NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"}:
            values[key] = value.strip().strip('"').strip("'")
url = values.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
if urlparse(url).scheme != "https" or not urlparse(url).hostname:
    raise SystemExit("A valid HTTPS Supabase URL is required.")
if not key.startswith("sb_publishable_"):
    try:
        payload = key.split(".")[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        assert claims.get("role") == "anon"
    except Exception:
        raise SystemExit("Only a public publishable key or legacy anon key is allowed.")
destination = root / "Config/Local.plist"
destination.write_bytes(plistlib.dumps({"supabaseURL": url, "publishableKey": key}))
os.chmod(destination, 0o600)
print("Local client configuration prepared; no privileged keys copied.")
