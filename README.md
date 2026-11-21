# Secret Boundary

Redact selected fields or exact paths from nested JSON, with an audit trail that excludes redacted values.

**Status:** implemented browser-local research prototype. Automated tests can be reproduced with the command below. GitHub Pages deployed and browser smoke checks completed on 19 November 2026.

## Website

Live website: https://royalpuskar.github.io/secret-boundary/

## Problem and approach

This tool makes the supplied security scenario inspectable through explicit rules, per-item results, and exportable evidence. It runs the same pure JavaScript engine in the browser and Node tests. All input is provided by the user or the included synthetic fixture; no external facts are inferred.

## Exact-path redaction and audit

Use `keys` for case-insensitive field-name matches anywhere, and optional `paths` for case-sensitive exact locations. Example:

```json
{"keys":["token"],"paths":["/private/value"],"record":{"private":{"value":"SYNTHETIC_SECRET"},"public":{"value":"visible"},"token":"SYNTHETIC_TOKEN"}}
```

Only the private value and token are redacted. Array indices use paths such as `/items/0/token`. Escape literal `~` as `~0` and literal `/` as `~1`; an empty path selects the whole record. Wildcards are not supported. Duplicate rules do not duplicate audit events. A removed parent is not traversed, so descendant path rules are reported as unmatched rather than claimed as evaluated.

The result contains `audit` entries with path and rule reason, and `unmatchedPaths` for rules not encountered. These fields appear in the full report and JSON export. They exclude redacted values, but paths reveal field names and structure; inspect reports before sharing. Unselected values remain present.

## Implemented features

- Editable scenario with a synthetic example and reset control.
- Deterministic analysis, summary metrics, filterable result table, and JSON report export.
- Input validation, explicit errors, and invalidation of outdated reports after edits.
- Keyboard-accessible controls, responsive layout, and large-screen CSS.
- Zero runtime dependencies and no external API calls.

## Install and run

Requirements: Python 3 for a static local server, Node.js 22 or later for tests.

```sh
git clone https://github.com/Royalpuskar/secret-boundary.git
cd secret-boundary
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open index.html through a file URL; ES modules require a server.

```sh
node --test test.mjs
```

## Example and schema

The complete example in `sample.mjs` defines the supported input shape:

```json
{
  "keys": [
    "password",
    "token"
  ],
  "record": {
    "user": "demo",
    "password": "SYNTHETIC_PASSWORD",
    "nested": [
      {
        "token": "SYNTHETIC_TOKEN",
        "status": "ok"
      }
    ]
  }
}
```

Edit one value and select **Run analysis**. **Reset example** restores the fixture. **Export report** downloads the current result; it never publishes it.

Input is capped at 200,000 serialized characters. Each rule list is limited to 500 entries; nesting is limited to 30 levels. Records must contain JSON-compatible values with finite numbers. Missing records and malformed paths fail explicitly. Use JSON-parsed inputs, not objects with executable getters or custom serialization.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses scenario JSON and calls `run` from `engine.mjs`. The engine returns `metrics` and `rows`; the UI renders values with `textContent`, never user-supplied HTML. Editing invalidates the prior report. Export creates a local Blob download.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

Explicit field-name and path rules only: the tool cannot discover secrets hidden in arbitrary strings or infer missing rules. It is not a production logging interceptor. Use synthetic data.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

Ten local automated tests passed for the field-name and exact-path engine. They cover selective redaction, escaped names, arrays, parent/root rules, duplicate rules, unmatched and malformed paths, prototype-like keys, non-JSON values, depth, determinism and input preservation. Earlier browser smoke checks covered the original UI; the new engine changes have not received live-browser verification. Remote CI results must be checked separately.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.
