<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- tsconfig keeps strict but disables noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature and exactOptionalPropertyTypes — existing code relies on looser indexing/optional typing.
- Reopening assignee colors use a normalized-name map in the operational localStorage state and the shared Chip renderer, keeping colors consistent across independent boards without modifying card data.