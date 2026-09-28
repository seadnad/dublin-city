# Dublin Drive: notes for Claude and its sub-agents

## Privacy and outbound requests (applies to every agent, including research sub-agents)

- Never send the owner's personal details anywhere: name, email, accounts, location, or anything taken from the git config or the environment. That covers HTTP headers (User-Agent included), URLs, query strings, request bodies, API keys and commit metadata sent to third parties.
- For web APIs that ask for a contact User-Agent (Wikimedia, Overpass, Nominatim, geograph), use a generic one such as `DublinDriveResearch/1.0 (hobby game research)`. Don't invent a contact address, and don't use a real one.
- Don't sign up for services, create accounts, request API tokens, or post, comment or upload anywhere public without the owner's explicit say-so. Downloading public data is fine.
- Don't put secrets, tokens or personal data in files under the repo; everything in it is published to GitHub Pages or the public repo.
- If something personal was sent by mistake, say so plainly in your report. Don't bury it.

## Licences for reference material

- Reference images come only from Wikimedia Commons or geograph under CC0, CC BY or CC BY-SA. No Google Street View or Google Images, and no scraping of sites whose terms forbid it.
- Record the source, author and licence of every downloaded image in the area's research doc, and in `refs/<area>/sources.json`.
- OpenStreetMap data (via Overpass) is ODbL. Keep raw pulls in `data/osm/`.

## Working rules

- Performance: changes that are pure efficiency go everywhere. Anything that trades looks for speed goes only into the Low / Battery saver graphics profiles; High stays full quality.
- Test harness: `node tools/check.mjs tools/scenarios/<x>.mjs [--mobile] [--build]`. `footprints.mjs` (no landmark on a road) and `bridges.mjs` (no road over water) must stay clean.
- `src/data/streets.json`: node IDs must be unique, because JSON.parse silently keeps the last duplicate and moves the node. Run `node tools/dupcheck.mjs` after editing, and write the file with `tools/streets-fmt.mjs` to keep its house style.
- Commit or push only when the owner has asked for it. Sub-agents commit on their own worktree branch and never push or merge.
