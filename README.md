# Secret Boundary

Redact selected fields or exact paths from nested JSON, with an audit trail that excludes redacted values.

**Status:** browser-local research prototype. The redaction studio redesign has passed engine tests, JavaScript syntax checks, and static selector checks. Browser interactions, mobile and 4K rendering, and deployment of this revision remain unverified.

## Website

Live website: https://royalpuskar.github.io/secret-boundary/

## Problem and approach

Logging a complete record can expose fields that should have stayed private. This studio lets you inspect a record, select exact paths or field-name rules, review the remaining values, and download redacted JSON separately from the audit. The browser and Node tests share the same deterministic redaction engine.

## Exact-path redaction and audit

Use `keys` for case-insensitive field-name matches anywhere, and optional `paths` for case-sensitive exact locations. Example:

```json
{"keys":["token"],"paths":["/private/value"],"record":{"private":{"value":"SYNTHETIC_SECRET"},"public":{"value":"visible"},"token":"SYNTHETIC_TOKEN"}}
```

Only the private value and token are redacted. Array indices use paths such as `/items/0/token`. Escape literal `~` as `~0` and literal `/` as `~1`; an empty path selects the whole record. Wildcards are not supported. Duplicate rules do not duplicate audit events. A removed parent is not traversed, so descendant path rules are reported as unmatched rather than claimed as evaluated.

The result contains `audit` entries with path and rule reason, and `unmatchedPaths` for rules not encountered. These fields appear in the audit panel and audit download. They exclude redacted values, but paths reveal field names and structure; inspect reports before sharing. Unselected values remain present.

## Implemented features

- Dedicated policy sidebar, source field tree, reviewed-output pane, and redaction audit.
- Add exact-path rules directly from the field tree. Values are hidden in the tree by default; an explicit checkbox reveals truncated previews. The source editor and reviewed output can still show values.
- Separate field-name and exact-path controls; an explicit whole-record option.
- Any source or policy edit clears prior output and disables both downloads.
- Separate redacted-record and audit downloads. Audit downloads omit record values.
- Responsive CSS, keyboard-operable controls, no runtime dependencies and no outbound API calls.
- Tree preview capped at 600 nodes; the complete input is still evaluated within engine limits.

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

## Command-line redaction

Requires Node.js 22 or later. Save a complete engine input object containing `keys`, optional `paths`, and `record` as `scenario.json`.

```sh
node redact.mjs scenario.json --audit audit.json --strict > redacted.json
cat scenario.json | node redact.mjs -
node redact.mjs --help
node --test test.mjs cli.test.mjs
```

The CLI reads the source without modifying it. Standard output contains only the redacted record. The optional audit contains rule paths, reasons, and counts, never the record output. Existing audit files and symbolic links are rejected; the CLI requests owner-only permissions when creating an audit file on systems supporting POSIX modes.

Exit codes: **0** success; **2** invalid arguments, input, or audit-write failure; **3** unmatched exact paths in strict mode. Strict mode rejects before creating an audit or writing output. It does not check whether every field-name rule matched or discover secrets without explicit rules. Error messages omit input snippets.

The input stream is capped at 800000 bytes, followed by the engine's 200000-character serialized limit. Invalid UTF-8 is rejected. The CLI buffers one JSON document; it is not a streaming JSONL processor. Audit paths may reveal sensitive field names. Shell redirection is controlled by your shell: never redirect output to your input file, and remember `>` can truncate an existing destination before the CLI starts. A downstream output failure can leave a successfully created audit; the two outputs are not a filesystem transaction.

Seven CLI integration tests passed locally, including stdin/file input, source preservation, strict failure, exclusive audit creation, invalid input, symbolic-link entry, side-effect-free import, and argument handling. Together with the ten engine tests, **17 local tests passed**. The workflow now runs both suites; remote CI results have not been verified.

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

In the website, paste only the `record` into **Edit or paste JSON**. Enter field names and exact paths in their separate controls, one per line. Use **Inspect fields**, optionally select **Redact path**, then **Apply policy**. **Reset sample** restores the synthetic fixture. Downloads save locally and never publish data. The full object above is the programmatic engine input.

Input is capped at 200,000 serialized characters. Each rule list is limited to 500 entries; nesting is limited to 30 levels. Records must contain JSON-compatible values with finite numbers. Missing records and malformed paths fail explicitly. Use JSON-parsed inputs, not objects with executable getters or custom serialization.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses record JSON and builds rules from separate controls before calling `run` from `engine.mjs`. The UI builds a field tree with DOM nodes and renders user text with `textContent`, never user-supplied HTML. Edits invalidate output and downloads. Export creates a local Blob; the audit export excludes the output record.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

Explicit field-name and path rules only: the tool cannot discover secrets hidden in arbitrary strings or infer missing rules. It is not a production logging interceptor. Use synthetic data.

The interface is designed around record inspection and redaction review. It does not automatically identify secrets. Paths and unredacted values can contain sensitive information. No accuracy, novelty, production-readiness, or 4K visual-test claim is made.

## Validation

Ten local automated tests passed for the field-name and exact-path engine. They cover selective redaction, escaped names, arrays, parent/root rules, duplicate rules, unmatched and malformed paths, prototype-like keys, non-JSON values, depth, determinism and input preservation. Earlier browser smoke checks covered the original UI; the new engine changes have not received live-browser verification. Remote CI results must be checked separately.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Verify the redesigned interaction flow with browser and keyboard testing.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.
