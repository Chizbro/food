# Eating the World

Static site to research + display cooking one food/dessert/beverage from every country.

## Run locally
`fetch('data.json')` needs HTTP, not `file://`. So:
```
python3 -m http.server   # then open http://localhost:8000
```

## Edit (research mode)
1. Click **Research mode** and enter your edit token (stored on the device after).
2. Click a country on the map (or search it) → a page is created.
3. Fill shortlists, click a 🔎 dish to search, paste **Selected** recipes as `Name | url`.
4. Click **Publish**. The lab writes `data.json` immediately, then commits that same file to the repo. If the commit fails, the button says the GitHub backup failed; the live site already has the new file.
5. `↻` discards this device's drafts and reloads the published version (use it before editing on a second device).

Edits are drafts in localStorage until you Publish. Visitors read the lab's `data.json`. Only requests with the edit token can write.

## Deploy (lab1)
Code is `~/code/food`. Data is `~/data/food/data.json`, mounted in `docker-compose.yml`. Caddy serves `https://food.tail76da76.ts.net` and proxies to `127.0.0.1:8375`.

`~/code/food/.env` (not committed) holds `EDIT_TOKEN` and `GH_TOKEN`. The edit token is the research-mode password. The GitHub token is a fine-grained token with Contents read and write on this repo, used only to commit `data.json`.

## Test
`node test_food.js`
