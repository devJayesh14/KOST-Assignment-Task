# Decisions

## Conflict 1: "everything on one page" vs. 25 records per request, 5 requests per minute

- **Chose:** numbered pagination, 25 rows per page, with search, filter and sort done by the API.
- **Rejected: fetch all pages in the background.** 137 records need 6 requests, but the limit is 5 per minute, so the first full load would always hit the limit. Every new search or sort would need 6 more requests.
- **Rejected: client-side search over a single page.** It would only search the 25 rows on screen, which gives wrong answers.
- **Rejected: infinite scroll / "Load more".** Users still trigger requests, and scrolling hides where they are. Numbered pages also fit the URL (`?page=3`), which makes a view shareable.
- **To soften the cost for ops:**
  - Loaded pages are cached, so going back to a page is free.
  - Search is debounced (300 ms), so typing does not spend the request budget.
  - A 429 shows a separate "Too many requests" state with a countdown, then retries once by itself.
- **What we gave up:** ops cannot see all 137 at once, and they have to click to move between pages.
- **Assumption:** the API accepts `q`, `status`, `sort`, `order`, `page` and `pageSize`. Without server-side search, correct search would require loading everything, which the rate limit forbids.

## Conflict 2: coloured dot only vs. "never colour alone"

- **Chose:** a coloured dot **plus** a visible text label (Active, Inactive, Suspended, Unknown).
- **Rejected: dot only with `aria-label` or a tooltip.** That still fails sighted users with colour-vision deficiency, and tooltips do not work on touch or keyboard.
- **Kept the designer's intent:** a small dot inside a quiet pill, so the table stays calm. Unknown uses a dashed dot, so it differs by shape as well as colour.
- **What we gave up:** a slightly wider status column.

## Messy data

All cleaning happens in `src/app/data/normalize-organisation.ts`. The fixture is served exactly as given.

| Quirk                                                 | Handling                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `name` is `""`, `null`, or has extra spaces           | Trimmed; empty names show "Unnamed organisation" in italic.                                                               |
| `status` is `ACTIVE`, `Active`, or `inactive`         | Trimmed and lower-cased.                                                                                                  |
| `status` is `actve`, `null`, or another unknown value | Shown as "Unknown", with the original value in a tooltip. Typos are **not** auto-corrected: guessing would hide bad data. |
| `memberCount` is `"12"`                               | Accepted as 12 (a digit-only string).                                                                                     |
| `memberCount` is `-1`, `null`, or non-numeric         | Shown as "—", with "Not available" for screen readers.                                                                    |
| No `owner`                                            | Shows "No owner".                                                                                                         |
| `owner.email` is `not-an-email`                       | Shown as-is with an "Invalid email" flag; the data is not hidden.                                                         |
| `createdAt` is epoch ms (`1710150720000`)             | Parsed. Numbers below 1e11 are treated as seconds.                                                                        |
| `createdAt` is `"not a date"`                         | Shows "Unknown date"; sorts last in either direction.                                                                     |
| Duplicate `id` (two records with 42)                  | Both are shown because they are different organisations. Rows are tracked by position, not `id`.                          |
| Arabic text with emoji                                | `dir="auto"` and `unicode-bidi: plaintext` so the text displays right-to-left correctly.                                  |
| Very long name                                        | Cut to two lines with an ellipsis; the full name is in the DOM and the `title`.                                           |

- **The messiest item** is `id: 42` appearing twice with different names and an invalid status. It breaks the usual "id is unique" assumption. The fix is in rendering, not data: track rows by position and never merge them.
- **Fixture expansion:** `scripts/generate-fixture.mjs` copies the 8 records verbatim, then adds 129 generated ones (137 total, matching the brief). About a third of the generated records repeat each quirk.

## Other decisions

- **State:** a component-scoped `OrganisationDirectoryStore` built on signals.
  - The URL is the single source of truth for search, status, sort and page. `toSignal(route.queryParamMap)` reads it, and `router.navigate` writes it.
  - RxJS is used only for the async pipeline (debounce, `switchMap` to cancel stale requests).
  - No `BehaviorSubject` holds view state.
- **URL format:** default values are left out, so the plain URL is `/` and a shared link only contains what was changed.
- **Mock API:** an `HttpInterceptorFn` (`src/app/mock-api`).
  - It adds a 400–900 ms delay, fails about 15% of list requests (503), and allows 5 list requests per rolling minute (429 with `Retry-After`).
  - Name checks and create requests are not rate-limited or randomly failed. The brief only specifies this for the list request.
  - Request times for the rate limit are kept in `localStorage`, so reloading or opening a new tab does not reset the limit. After a reload during a 429, the first request gets a fresh 429 with the remaining `Retry-After`, and the countdown continues from there.
  - Organisation data lives in memory and resets on reload.
  - I chose an interceptor over a separate mock server so the deployed demo needs no backend.
- **Form:** a typed `NonNullableFormBuilder` form with `updateOn: 'blur'`.
  - Errors appear on blur, not on each keystroke.
  - Name uniqueness (case-insensitive and NFKC-normalised) is checked on blur by an async validator. The server checks again on create; a 409 becomes a field error.
  - Email uses a stricter pattern than `Validators.email`, which accepts `a@b`.
  - A failed submit shows an error summary at the top with links to each field, and moves focus to it. The submit button is never the only signal.
  - The button stays enabled (`aria-disabled` while sending) so it remains focusable and explainable.
- **New organisations** appear first in the default order, so the user sees the result straight away.
- **No Actions column:** the brief only covers finding, checking and adding, and a dead "Edit" button would mislead.
- **Translations:** one `en.json`, a ~30-line `TranslationService` and a `translate` pipe, with `{{param}}` interpolation. No i18n library, to avoid a dependency for something this small.
- **Design tokens:** all colours, spacing, radii, shadows and type sizes are CSS custom properties in `src/styles.scss`. Changing `--color-primary` rebrands the app.

## AI tool declaration

- **Tool:** Cursor (agent mode).
- **Used for:** scaffolding the Angular project, the presentation components and styles, the design tokens, the fixture generator, the mock API, the store, normalisation, form validation, and drafting this document.
- **My part:** _fill in honestly — e.g. reviewed every file, chose the conflict resolutions, tested the states in the browser, changed X and Y._
