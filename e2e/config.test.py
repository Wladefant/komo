#!/usr/bin/env python3
"""Config test proving e2e.config.ts refuses non-allowed and production hosts.

Policy: workflows/e2e/POLICY.md rule 6. Issue: https://github.com/Wladefant/super-board/issues/476
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent

# 1. Verify e2e.config.ts and package.json pass the Superboard e2e guard. The guard lives in a super-board checkout:
# SUPERBOARD_ROOT, default a sibling directory of this repository. A missing guard is a failure, never a skip.
superboard_root = Path(os.environ.get("SUPERBOARD_ROOT", str(HERE.parent.parent / "super-board")))
guard_script = superboard_root / "workflows" / "e2e" / "e2e_guard.py"
assert guard_script.is_file(), f"e2e_guard.py not found at {guard_script}; set SUPERBOARD_ROOT to a super-board checkout"
sys.path.insert(0, str(guard_script.parent))
import e2e_guard
findings = e2e_guard.check_config(HERE / "e2e.config.ts", HERE / "package.json")
assert not findings, f"e2e_guard findings: {findings}"
print("PASS: e2e_guard config check passes with zero findings")

# 2. Extract and parse host allow-list and deny-lists from e2e.config.ts
config_text = (HERE / "e2e.config.ts").read_text(encoding="utf-8")

guard_match = re.search(r"// BEGIN host-guard\r?\n(.*?)// END host-guard", config_text, re.S)
assert guard_match, "host-guard block must be present in e2e.config.ts"
guard_body = guard_match.group(1)

# Extract lists directly from the guard block
forbidden_exact = re.findall(r"FORBIDDEN_EXACT_HOSTS:\s*string\[\]\s*=\s*\[([^\]]*)\]", guard_body)
assert forbidden_exact, "FORBIDDEN_EXACT_HOSTS missing"
forbidden_hosts = [h.strip().strip("'\"") for h in forbidden_exact[0].split(",") if h.strip()]

forbidden_tokens_match = re.findall(r"FORBIDDEN_HOST_TOKENS:\s*string\[\]\s*=\s*\[([^\]]*)\]", guard_body)
assert forbidden_tokens_match, "FORBIDDEN_HOST_TOKENS missing"
forbidden_tokens = [t.strip().strip("'\"") for t in forbidden_tokens_match[0].split(",") if t.strip()]

staging_match = re.findall(r"const STAGING_HOSTS:\s*string\[\]\s*=\s*\[([^\]]*)\]", config_text)
staging_hosts = [s.strip().strip("'\"") for s in staging_match[0].split(",") if s.strip()] if staging_match else []
allowed_hosts = ["localhost", "127.0.0.1"] + [h.lower().rstrip(".") for h in staging_hosts]

def norm_host_name(h: str) -> str:
    return h.lower().rstrip(".")

def host_refusal(raw_host: str) -> str | None:
    host = norm_host_name(raw_host)
    if host in forbidden_hosts or any(t in host for t in forbidden_tokens):
        return "forbidden-production-host"
    if not any(host == a or host.endswith("." + a) for a in allowed_hosts):
        return "not-in-allow-list"
    return None

def request_host_refusal(raw_url: str) -> str | None:
    try:
        u = urlparse(raw_url)
    except Exception:
        return "unparseable-url"
    if u.scheme not in ("http", "https", "ws", "wss"):
        return None
    return host_refusal(u.hostname or "")

# 3. Assertions proving config refuses non-allowed and production hosts
# Allowed
assert host_refusal("localhost") is None, "localhost must be allowed"
assert host_refusal("127.0.0.1") is None, "127.0.0.1 must be allowed"
assert host_refusal("staging.pinthread.dev") is None, "staging.pinthread.dev must be allowed"
assert host_refusal("preview.staging.pinthread.dev") is None, "subdomain of staging must be allowed"

# Production exact hosts refused
assert host_refusal("polysimulator.com") == "forbidden-production-host", "polysimulator.com must be refused"
assert host_refusal("www.polysimulator.com") == "forbidden-production-host", "www.polysimulator.com must be refused"
assert host_refusal("app.polysimulator.com") == "forbidden-production-host", "app.polysimulator.com must be refused"
assert host_refusal("prod.polysimulator.com") == "forbidden-production-host", "prod.polysimulator.com must be refused"

# Production tokens refused
assert host_refusal("zaraprptkegxqpvnsubu.supabase.co") == "forbidden-production-host", "zaraprptkegxqpvnsubu token must be refused"
assert host_refusal("akamai-iad-prod.net") == "forbidden-production-host", "akamai-iad-prod token must be refused"

# Arbitrary external host refused
assert host_refusal("attacker.example.com") == "not-in-allow-list", "unknown host must be refused"
assert host_refusal("evil.test") == "not-in-allow-list", "unknown host must be refused"

# Request host checks
assert request_host_refusal("http://127.0.0.1:4340/assets/site.js") is None, "local request allowed"
assert request_host_refusal("https://polysimulator.com/api") == "forbidden-production-host", "production request refused"
assert request_host_refusal("https://evil.test/leak") == "not-in-allow-list", "unauthorized request refused"
assert request_host_refusal("data:image/png;base64,abc") is None, "data: url is local"

print("PASS: config refuses non-allowed hosts, refuses production hosts and tokens, permits local development.")
