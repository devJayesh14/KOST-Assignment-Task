# Organisation Directory

Angular take-home assessment: find an organisation, check its status, add a new one.

## Run

```bash
npm install
npm start          # http://localhost:4200
npm run build      # production build in dist/organisation-directory
```

The API is mocked in the browser (`src/app/mock-api`), so no backend is needed. It adds a 400–900 ms delay, fails about 15% of list requests, and allows 5 list requests per minute. Data resets on reload.

## Where things are

| Path | What |
|---|---|
| `src/app/organisation-directory/` | Page component and its signal store (URL sync, loading, retry) |
| `src/app/data/` | API client, URL query parsing, data normalisation |
| `src/app/mock-api/` | Mock API interceptor and the 137-record fixture |
| `src/app/organisation-form/` | Create form and validators |
| `src/app/i18n/en.json` | Every user-facing string |
| `src/styles.scss` | Design tokens and shared styles |
| `scripts/generate-fixture.mjs` | Regenerates the fixture (`npm run generate:fixture`) |

Decisions, conflict resolutions and the AI-tool declaration are in [DECISIONS.md](DECISIONS.md).
