# LUTEST — Migration Plan from MVP to Production

Phiên bản: 1.0  
Ngày: 30/06/2026  
Nguồn chuẩn: `master-srs-production.md`  
Mục tiêu: hướng dẫn nâng code/documentation hiện tại từ MVP/local-core sang production-grade mà không phá flow đang chạy.

---

## 0. Current Reality

SRS cũ phù hợp MVP/local-core vì tập trung vào:

1. CLI local command.
2. Express worker local API.
3. Project detection cơ bản.
4. Graph extraction cơ bản.
5. Static scan/report pipeline.
6. Dashboard đọc API thật.
7. `.lutest/` storage.

Nhưng production còn thiếu:

1. Runtime validation đầy đủ.
2. Path security policy rõ.
3. Report schema integrity.
4. AST symbol graph.
5. Typed issue taxonomy đủ rộng.
6. Scan job lifecycle cho browser scan dài.
7. Playwright/visual mapping về source.
8. CLI lifecycle hardening.
9. Release gate.

---

## 1. Migration Strategy

Không rewrite toàn bộ. Làm theo hướng:

```txt
Stabilize contracts + security boundary
→ strengthen storage/report
→ replace graph internals gradually
→ keep API compatible where possible
→ migrate UI to new graph mode
→ add runtime scan after P0/P1
```

---

## 2. Phase M0 — Freeze MVP Behavior

### Goal

Đóng băng behavior hiện tại để migration không phá cái đang chạy.

### Tasks

1. Ghi lại route hiện tại:
   ```txt
   GET /api/status
   GET /api/project
   GET /api/graph
   GET /api/report/latest or /api/report
   POST /api/scan
   ```
2. Ghi lại actual response từ worker hiện tại.
3. Tạo smoke tests trước khi refactor.
4. Mark docs/status:
   ```txt
   Graph v1 = file-level graph
   Scan v1 = static scan
   Report v1 = local JSON report
   Dashboard v1 = local API dashboard
   ```

### Acceptance criteria

- Có baseline tests trước khi sửa lớn.
- Không gọi v1 là production done.

---

## 3. Phase M1 — Route Canonicalization

### Problem

SRS production chọn:

```txt
POST /api/actions/scan
```

Code MVP có thể đang dùng:

```txt
POST /api/scan
```

### Migration

1. Add canonical route:
   ```txt
   POST /api/actions/scan
   ```
2. Keep legacy alias temporarily:
   ```txt
   POST /api/scan
   ```
3. UI switches to canonical route.
4. Docs mark `/api/scan` deprecated.
5. Add test both routes call same service.

### Removal criteria for legacy route

Remove `/api/scan` only when:

1. UI no longer uses it.
2. Docs no longer use it as canonical.
3. Tests pass.
4. Changelog notes breaking/removal if package already published.

---

## 4. Phase M2 — Contracts + Runtime Validators

### Current MVP issue

TypeScript contracts exist, but HTTP input/output may not be runtime-validated.

### Migration tasks

1. Add validator utilities in `packages/contracts`.
2. Add validators incrementally:
   ```txt
   validateScanRequest
   validateProjectPathQuery
   validateProjectSummary
   validateGraphResponse
   validateScanResponse
   validateLatestReportResponse
   validateApiErrorResponse
   ```
3. Update controllers to validate request.
4. Update report writer to validate `ScanResponse` before write.
5. Update report reader to validate stored JSON.
6. Add unit tests.

### Acceptance criteria

- Invalid scan body returns 400.
- Invalid project path query returns 400/403/404 depending case.
- Invalid stored report returns schema/read error, not null.

---

## 5. Phase M3 — Path Policy

### Current MVP issue

Local dashboard/worker may accept path input too freely.

### Migration tasks

1. Add `pathPolicyService.assertProjectRoot`.
2. CLI passes allowed project root to worker.
3. All path entrypoints call path policy:
   ```txt
   project controller
   graph controller
   report controller
   scan controller
   ```
4. Reject path outside allowed root.
5. Add tests for traversal/symlink/missing/file path.

### Acceptance criteria

- Dashboard cannot scan arbitrary filesystem path.
- Worker never writes `.lutest` outside target project root.
- Windows paths work.

---

## 6. Phase M4 — Report Storage Integrity

### Current MVP issue

`readJson` returning `null` for many failures hides malformed/schema-invalid/permission errors.

### Migration tasks

1. Add `JsonReadResult<T>`.
2. Change storage service read behavior.
3. Change report repository to use result type.
4. Validate report schema.
5. Update report API behavior:
   ```txt
   missing -> 200 { report: null }
   malformed -> 500 REPORT_READ_ERROR
   schema invalid -> 422 SCHEMA_INVALID
   ```
6. Update UI to show these states.

### Acceptance criteria

- Missing report remains valid empty state.
- Malformed report shows error, not empty state.
- Schema invalid report shows schema error.

---

## 7. Phase M5 — Graph Contract Migration

### Current MVP graph

Likely contract:

```ts
GraphNode.type = "page" | "component" | "api" | "file"
GraphEdge.type = "import" | "use" | "call"
GraphSummary = pageCount/componentCount/apiCount/fileCount
```

### Production graph

New contract:

```ts
GraphNode.kind =
  | "file"
  | "page"
  | "component"
  | "hook"
  | "api-route"
  | "api-client-method"
  | "utility"
  | "external-endpoint";
```

### Migration options

#### Option A — Breaking contract

Change `type` to `kind` directly.

Pros:

```txt
cleaner long-term
less confusion
```

Cons:

```txt
requires UI/worker/docs update together
```

#### Option B — Compatibility layer

Keep old fields and add new fields:

```ts
GraphNode = {
  id: string;
  type?: LegacyGraphNodeType;
  kind: GraphNodeKind;
  ...
}
```

Pros:

```txt
safer incremental migration
```

Cons:

```txt
can keep old ambiguity alive too long
```

### Recommendation

If not published publicly yet: choose **Option A** and migrate cleanly.

### Acceptance criteria

- UI uses `kind`, not legacy `type`.
- Summary distinguishes file/page/component/hook/apiRoute/apiClient/externalEndpoint.
- Validators updated.
- Graph snapshot schema version added if needed.

---

## 8. Phase M6 — AST Parser Introduction

### Migration approach

Do not delete file-level graph immediately. Add modes:

```txt
file
symbol
mixed
```

### Tasks

1. Implement AST parser module.
2. Parse TS/TSX/JS/JSX.
3. Extract imports/exports/declarations/JSX/calls/API calls.
4. Build symbol nodes.
5. Link edges.
6. If parser fails for a file, create diagnostic and fallback file node.

### Acceptance criteria

- Existing graph endpoint still returns valid graph.
- Symbol mode is default production.
- Parse error in one file does not break whole graph.
- Fixture tests pass.

---

## 9. Phase M7 — UI Graph Migration

### Current MVP UI risk

Dashboard may render simple counts and file-level nodes. Production UI must not mislead user.

### Tasks

1. Show graph mode:
   ```txt
   file-level / symbol-level / mixed
   ```
2. Render node kinds:
   ```txt
   page, component, hook, api-route, api-client-method, external-endpoint, file
   ```
3. Render edge kinds:
   ```txt
   import, render, call, http, route
   ```
4. Show diagnostics panel.
5. Show confidence on low/medium edges.
6. Update summary cards.

### Acceptance criteria

- User can tell whether graph is production symbol graph or fallback.
- UI does not present low-confidence inferred edge as certain.
- Empty/malformed graph states handled.

---

## 10. Phase M8 — Scan Pipeline Migration

### Current MVP scan

Static scan returns direct `ScanResponse`.

### Production target

Static scan can remain sync. Full browser scan should support job lifecycle.

### Tasks

1. Keep direct static scan path.
2. Add scan job manager for full scan.
3. Add scan progress endpoint.
4. Add cancellation.
5. Ensure latest report only writes completed scan.
6. Prevent concurrent write races.

### Acceptance criteria

- Static scan still works.
- Full scan can run async.
- UI handles scan running progress.
- Double click scan does not corrupt latest report.

---

## 11. Phase M9 — Playwright + Runtime Mapping

### Prerequisite

Only start after:

```txt
runtime validators pass
path policy pass
report integrity pass
symbol graph pass
```

### Tasks

1. Launch Chromium.
2. Navigate discovered/sample routes.
3. Capture screenshot.
4. Collect console/page errors.
5. Collect DOM bounding boxes.
6. Run visual checks.
7. Map issue route -> graph nodes.
8. Store screenshot paths in report.

### Acceptance criteria

- Target URL dead handled.
- Browser missing handled.
- Screenshot filename safe.
- Issue includes route and possible nodeIds.
- No secrets logged.

---

## 12. Phase M10 — CLI Production Lifecycle

### Tasks

1. Implement `lutest scan <projectPath>`.
2. Validate project arg.
3. Select available port.
4. Spawn worker.
5. Wait `/api/status`.
6. Call canonical scan route.
7. Print summary.
8. Shutdown worker.
9. Exit codes:
   ```txt
   0 passed
   1 failed/internal error
   2 invalid input
   ```

### Acceptance criteria

- Port conflict handled.
- Startup timeout handled.
- Ctrl+C cleanup.
- npm pack install works.

---

## 13. Phase M11 — Cache Diff

### Prerequisite

Graph symbol-level must exist.

### Tasks

1. Hash source files.
2. Store `.lutest/hash.json`.
3. Compare changed files.
4. Map changed files to graph nodes.
5. Trace affected pages/routes.
6. Suggest retest routes.
7. Fallback full scan on missing/stale graph.

### Acceptance criteria

- Changing shared component affects multiple pages.
- Missing hash does not block scan.
- Stale graph forces full scan.

---

## 14. Phase M12 — Release Gate

### Tasks

1. Update README.
2. Update docs.
3. Run typecheck/build/tests.
4. Run fixture scans.
5. npm pack.
6. global install tarball.
7. dry-run publish.
8. inspect tarball.
9. publish only if all pass.

### Acceptance criteria

- No fixtures/dev junk in tarball.
- CLI works after global install.
- Report/graph written correctly.

---

## 15. Backward Compatibility Matrix

| Area | MVP | Production | Migration strategy |
|---|---|---|---|
| Scan route | `/api/scan` | `/api/actions/scan` | Alias then deprecate |
| Graph node field | `type` | `kind` | Prefer breaking if unpublished |
| Graph count | file-level | symbol-level | Add mode/mixed diagnostics |
| Report read | `null` on many errors | typed read result | Update API/UI |
| API validation | TS only | runtime validators | Add validators gradually |
| Path policy | loose | allowed root policy | Enforce at controllers |
| Scan lifecycle | sync | sync static + async full | Add job manager |
| Visual scan | not ready | Playwright + DOM + mapping | Start after P0/P1 |

---

## 16. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| AST parser too ambitious | Delays production | Start with TS/TSX common cases + diagnostics |
| Contract breaking UI | Dashboard crash | Update UI in same PR or compatibility layer |
| Path policy blocks valid user case | Bad UX | Document allowed root and add explicit config allowlist later |
| Report schema migration breaks old reports | Confusing state | Add schema version and clear error |
| Full scan timeout | Bad UX | Add scan job manager |
| Visual checks false positives | Low trust | Filters, confidence, max issue per route |
| Cache diff wrong | Missed bugs | Fallback full scan unless confidence high |

---

## 17. Recommended PR Order

```txt
PR-01: route canonicalization + smoke tests
PR-02: ApiErrorResponse + error middleware hardening
PR-03: contracts validators
PR-04: path policy
PR-05: storage read result + report integrity
PR-06: graph contract production update
PR-07: AST parser foundation
PR-08: symbol graph builder + fixtures
PR-09: UI graph migration
PR-10: rule engine budget/config
PR-11: CLI lifecycle hardening
PR-12: scan job manager
PR-13: Playwright runner
PR-14: DOM/visual engine
PR-15: cache diff
PR-16: release gate
```

---

## 18. Migration Done Criteria

Migration from MVP to production is done only when:

1. MVP docs are clearly marked as old/local-core.
2. Production SRS is canonical.
3. API contracts production are implemented.
4. Runtime validators cover API/storage.
5. Path policy blocks unsafe scan paths.
6. Report storage integrity works.
7. Graph is AST symbol-level by default.
8. UI displays symbol graph and diagnostics.
9. CLI can run end-to-end scan.
10. Fixture tests pass.
11. Release gate pass.

Before that, status must remain:

```txt
Production migration in progress
```

not:

```txt
Production done
```
