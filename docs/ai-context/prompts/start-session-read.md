# Start Session Prompt

Use this prompt at start of a new AI/code session:

```txt
Read `AI_HANDOFF.md` first, then read all files in `docs/ai-context/`.

After reading, summarize project state in 10 lines:
1. What Lutest is.
2. Current primary graph path.
3. Latest completed phase.
4. Next recommended phase.
5. Important UI files.
6. Important worker files.
7. Important contracts/docs files.
8. Current known limitations.
9. Current working tree status.
10. Tests/checks last recorded.

Then list 5 things not to misunderstand.

Run or request:
- `git status`
- `git diff --stat`

Do not edit code until you confirm understanding of context.
If docs conflict with code, prefer code and report the mismatch.
Do not copy chat history into repo docs.
Do not record secrets.
```
## Approval Gate

When the user asks a question such as "có nên không?", "được không?", "nên làm gì?", "test thử xem hiểu không?", or "đánh giá giúp", answer only. Do not edit files.

Only modify code after an explicit implementation command such as "bắt đầu phase", "hãy sửa", "implement", "apply changes", or "code đi".

If ambiguous, ask for confirmation.

## API Shape Protection

Do not change shared contracts, API response shapes, ScanRequest, ScanResponse, or `/api/actions/scan` behavior unless the current phase explicitly requires it.

If asked whether an API shape should change, provide risk analysis only and wait for approval.
