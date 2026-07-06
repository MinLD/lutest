# Read Me First

Use this folder as compact project memory for AI handoff. It is not a full changelog and not chat history.

## How To Use

- Start every AI/code session by reading `AI_HANDOFF.md` and files in this folder.
- Verify current code/docs with `git status` and targeted reads before editing.
- If context conflicts with code, prefer current code and report mismatch.
- Keep context short: facts, decisions, known risks, next tasks.

## Canonical Sources

- Production docs: `docs/plan/`
- Progress log: `docs/plan/production-refactor-progress.md`
- Context entrypoint: `AI_HANDOFF.md`
- Legacy MVP docs: archive/reference only, not implementation source.

## Update Rule

At session end, update only facts that changed. Do not copy chat. Do not mark tests as passed unless actually run.
## Approval Gate

When the user asks a question such as "có nên không?", "được không?", "nên làm gì?", "test thử xem hiểu không?", or "đánh giá giúp", answer only. Do not edit files.

Only modify code after an explicit implementation command such as "bắt đầu phase", "hãy sửa", "implement", "apply changes", or "code đi".

If ambiguous, ask for confirmation.

## API Shape Protection

Do not change shared contracts, API response shapes, ScanRequest, ScanResponse, or `/api/actions/scan` behavior unless the current phase explicitly requires it.

If asked whether an API shape should change, provide risk analysis only and wait for approval.
