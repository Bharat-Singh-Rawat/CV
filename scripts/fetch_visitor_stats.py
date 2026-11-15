#!/usr/bin/env python3
"""Fetch visitor stats from GoatCounter and write assets/stats/visitors.json.

Run by .github/workflows/visitor-stats.yml. Needs env GOATCOUNTER_TOKEN
(an API token with "read statistics" permission). Standard library only.
The file is only rewritten when the numbers change, so no empty commits.
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

SITE = os.environ.get("GOATCOUNTER_SITE", "bharatrawat")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "stats", "visitors.json")
SINCE = datetime(2026, 11, 1, tzinfo=timezone.utc)      # tracking started Nov 2026
DAYS = 30
TOP = 10


def api(path, **params):
    url = f"https://{SITE}.goatcounter.com/api/v0/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}",
                                               "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        hint = {401: "token not recognised: re-create it and update the GOATCOUNTER_TOKEN secret",
                403: "token lacks permission: tick 'Read statistics' on the token"}.get(e.code, "")
        sys.exit(f"GoatCounter {path} -> HTTP {e.code} {hint}\n{body}")
    time.sleep(0.5)                                     # stay well under 4 req/s
    return data


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:00:00Z")


def main():
    if not TOKEN:
        sys.exit("GOATCOUNTER_TOKEN is not set")
    print(f"token length: {len(TOKEN)} characters")      # length only, never the value
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    since = SINCE if SINCE < now else now - timedelta(days=1)

    all_time = api("stats/total", start=iso(since), end=iso(now))
    recent = api("stats/total", start=iso(now - timedelta(days=DAYS)), end=iso(now))
    locs = api("stats/locations", start=iso(since), end=iso(now), limit=TOP)

    by_day = {s["day"]: int(s.get("daily") or 0) for s in recent.get("stats", [])}
    first = (now - timedelta(days=DAYS - 1)).date()
    daily = [{"day": (first + timedelta(days=i)).isoformat(),
              "count": by_day.get((first + timedelta(days=i)).isoformat(), 0)} for i in range(DAYS)]

    countries = [{"code": (s.get("id") or "").upper(), "name": s.get("name") or "Unknown",
                  "count": int(s.get("count") or 0)}
                 for s in locs.get("stats", []) if int(s.get("count") or 0) > 0]

    data = {"total": int(all_time.get("total") or 0), "daily": daily, "countries": countries}

    try:
        with open(OUT) as f:
            old = json.load(f)
        old.pop("updated", None)
        if old == data:
            print("no change")
            return
    except (OSError, ValueError):
        pass

    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f, indent=1)
        f.write("\n")
    print(f"updated: {data['total']} visitors, {len(countries)} countries")


if __name__ == "__main__":
    main()
