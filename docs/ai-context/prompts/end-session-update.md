# End Session Update Prompt

Use this prompt before ending an AI/code session:

```txt
Update repo-local AI context if project state changed.

First check:
- `git status`
- `git diff --stat`

Record only durable facts:
- phase completed or blocked
- files changed
- what changed
- tests actually run
- pass/fail result
- known limitations
- next recommended phase

Do not write "passed" unless command actually ran and exited successfully.
Do not copy full chat history.
Do not store secrets, tokens, cookies, passwords, or private credentials.
Do not hide unresolved failures.

Update as needed:
- `AI_HANDOFF.md`
- `docs/ai-context/03-current-state.md`
- `docs/ai-context/04-decisions.md` if new decisions were made
- `docs/ai-context/05-known-issues.md`
- `docs/ai-context/06-next-tasks.md`
- `docs/ai-context/07-session-handoff.md`
- `docs/plan/production-refactor-progress.md`
```
## Approval Gate

When the user asks a question such as "có nên không?", "được không?", "nên làm gì?", "test thử xem hiểu không?", or "đánh giá giúp", answer only. Do not edit files.

Only modify code after an explicit implementation command such as "bắt đầu phase", "hãy sửa", "implement", "apply changes", or "code đi".

If ambiguous, ask for confirmation.

## API Shape Protection

Do not change shared contracts, API response shapes, ScanRequest, ScanResponse, or `/api/actions/scan` behavior unless the current phase explicitly requires it.

If asked whether an API shape should change, provide risk analysis only and wait for approval.
