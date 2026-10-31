#!/usr/bin/env python3
"""Regenerate cover-api.js's COVER_FOLDERS map from the chart list API.

Usage: python3 scripts/gen-cover-map.py [--ids-from-repo]
Reads every song id referenced in the repo (id: '123', data-song-id="123", ...),
looks each one up in https://download.wmc.pub/api/v1/charts (shortid == id padded
to 6 digits) and rewrites the map block between the BEGIN/END markers.
Ids that are not in the map still work: cover-api.js falls back to /s/<shortid>/bg.png.
"""
import json, re, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://download.wmc.pub"
TARGET = ROOT / "cover-api.js"


def fetch(url, tries=6):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception:
            time.sleep(1 + i)
    raise SystemExit(f"failed to fetch {url}")


def repo_ids():
    out = subprocess.run(
        ["grep", "-rhoE", r"(id|detailId): *'[0-9]+'|data-song-id=\"[0-9]+\"|covers/[0-9]+\.png",
         "--include=*.js", "--include=*.html", "--exclude=cover-api.js", "."],
        capture_output=True, text=True, cwd=ROOT).stdout
    return sorted({m for m in re.findall(r"\d+", out)}, key=int)


def main():
    charts, page = {}, 1
    while True:
        d = fetch(f"{BASE}/api/v1/charts?page={page}&limit=200")
        for c in d["charts"]:
            charts.setdefault(c["shortid"], c)
        if page >= d["pages"]:
            break
        page += 1
    mapping, missing = {}, []
    for i in repo_ids():
        c = charts.get(i.zfill(6))
        if c:
            mapping[i] = [c["versionFolder"], c["folderName"]]
        else:
            missing.append(i)
    body = ",\n".join(f"        {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}"
                      for k, v in sorted(mapping.items(), key=lambda kv: int(kv[0])))
    src = TARGET.read_text(encoding="utf-8")
    new = re.sub(r"(// BEGIN COVER_FOLDERS\n).*?(        // END COVER_FOLDERS)",
                 lambda m: m.group(1) + body + "\n" + m.group(2), src, flags=re.S)
    TARGET.write_text(new, encoding="utf-8")
    print(f"{len(mapping)} ids mapped; not in chart list: {missing}")


if __name__ == "__main__":
    main()
