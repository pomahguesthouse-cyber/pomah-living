<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application architecture

- Keep fixture properties and scenarios in a browser-safe local data module; the first version is a no-login, in-memory demo.
- Keep financial formulas, validation, and decision precedence in pure functions with concrete unit tests, so all pages apply the same investment rules.
- Use an asset-keyed Zustand store for editable form and checklist state, so navigating between properties preserves each simulation without browser persistence.
- Use the root route for the shared header and footer and leaf routes for home, asset selection, and asset analysis, so navigation remains typed and each page has its own metadata.
- Keep visual tokens and reusable styles in the global design system and use shadcn controls, so branding and interaction remain consistent.

- Route auth and profile calls through src/services/auth-service.ts and share the session via one Zustand store synced in the root route, so components never call the auth client directly.
- Keep flipping formulas and validated payloads separate from the legacy auction simulation, so expanded cost assumptions never change existing decisions.
- Store detailed flipping payloads in an owner-protected companion table keyed to existing projects; do not overwrite legacy project totals or status.
- Scope flipping state by project and account; persist only explicitly fictional demo projects to localStorage after hydration, so private project data never enters browser persistence.
- Use one public project-detail route with an inline sign-in state for private IDs and owner-scoped service reads; show fictional fixtures independently of asset preferences.
- Route admin and public slider data through the admin service; enforce privileges through database RLS and authenticated directory RPC, with atomic database-trigger audit so browser calls cannot bypass authorization or omit records.
- Provision admin roles only through owner-authorized privileged operations; never select an account automatically or expose role writes to authenticated users.
- Keep shared demo drafts and publications in separate RLS-filtered rows; key local demo edits by canonical ID and published revision so stale simulations never shadow new publications or affect private projects.
