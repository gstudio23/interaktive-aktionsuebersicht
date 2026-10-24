#!/usr/bin/env python3
"""Refresh the local action snapshot from the Community Game GitLab API."""

import argparse
import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "micgn/community-game/community-game-core"
API = "https://git-ce.rwth-aachen.de/api/v4/projects/" + urllib.parse.quote(PROJECT, safe="") + "/issues"


def label_values(labels, prefix):
    return [label.split(":", 1)[1].strip() for label in labels
            if label.startswith(prefix + ":")]


def short_description(markdown):
    lines = []
    for line in markdown.splitlines():
        line = line.strip()
        if not line or line.startswith("!"):
            continue
        line = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", line)
        line = re.sub(r"^[#*\-\s]+", "", line).replace("**", "").strip()
        if line:
            lines.append(line)
        if len(lines) == 3:
            break
    return " ".join(lines)[:280]


def fetch_issues(token):
    issues = []
    page = 1
    while True:
        query = urllib.parse.urlencode({"scope": "all", "per_page": 100, "page": page})
        request = urllib.request.Request(API + "?" + query,
                                         headers={"PRIVATE-TOKEN": token, "Accept": "application/json"})
        with urllib.request.urlopen(request, timeout=30) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise ValueError("GitLab API returned an unexpected response")
        issues.extend(batch)
        if len(batch) < 100:
            return issues
        page += 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-file", type=Path, help="Previously downloaded GitLab API JSON")
    args = parser.parse_args()
    if args.from_file:
        issues = json.loads(args.from_file.read_text(encoding="utf-8"))
    else:
        token = os.environ.get("GITLAB_TOKEN")
        if not token:
            parser.error("Set GITLAB_TOKEN or use --from-file")
        issues = fetch_issues(token)

    actions = []
    for issue in issues:
        labels = issue.get("labels") or []
        points = sorted({int(value) for value in label_values(labels, "Punkte") if value.isdigit()})
        details = (issue.get("description") or "").strip()
        actions.append({
            "id": issue["iid"],
            "title": issue.get("title") or "Ohne Titel",
            "url": issue["web_url"],
            "points": points,
            "scopes": label_values(labels, "Wirkungskreis"),
            "teams": label_values(labels, "Teamsize"),
            "status": next(iter(label_values(labels, "Status")), ""),
            "catchup": "Punkte nachholen" in labels,
            "state": issue.get("state") or "",
            "term": issue.get("due_date"),
            "description": short_description(details),
            "details": details,
        })
    actions.sort(key=lambda action: action["title"].casefold())
    target = ROOT / "data" / "actions.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(actions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(actions)} actions to {target}")


if __name__ == "__main__":
    main()
