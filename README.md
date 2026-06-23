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
4. Click **Publish** → commits `data.json` to the repo; the public site updates in ~1 min.
5. `↻` discards this device's drafts and reloads the published version (use it before editing on a second device).

Edits are drafts in localStorage until you Publish. Public visitors read the committed `data.json`; only requests with the token can write.

## Deploy (Netlify)
1. Push this repo to GitHub, then connect it on Netlify. No build command, publish dir = root.
2. Create a GitHub **fine-grained token** scoped to this repo with **Contents: read and write**.
3. In Netlify → Site settings → Environment variables, set:
   - `EDIT_TOKEN` — any long random string (the password you type in research mode)
   - `GH_TOKEN`   — the GitHub token from step 2
   - `GH_REPO`    — `your-user/your-repo`
   - `GH_BRANCH`  — optional, defaults to `main`

The two tokens live only in Netlify and never reach the browser. `EDIT_TOKEN` is the single secret that gates publishing.

## Test
`node test_food.js`
