# LeaseGuard plugin for Kepler and Claude Code

LeaseGuard pauses training runs that **finished** and hands runs that look **broken** (stalled, NaN loss, OOM, crashed) to an SRE agent. This plugin makes Kepler (or Claude Code) that SRE.

| Component | What it does |
|---|---|
| `.mcp.json` | Connects to the LeaseGuard backend's MCP server at `${LEASEGUARD_URL}/mcp/` with tools `list_runs`, `get_run`, `get_logs`, `get_probe_history`, `extend`, `pause_now`, `resume`, `resolve`. |
| `/leaseguard:triage <run_id>` | Gathers evidence through MCP, classifies OOM / NaN / hang / crash, **proposes** `jl exec` diagnostics for you to approve (never runs them itself), then suggests a fix and offers `resolve` / `resume` / `pause_now`. |
| `/leaseguard:run-status [run_id]` | Read-only summary of guarded runs. |
| `hooks/` | **PreToolUse:** asks before any `jl create` (the new GPU starts unguarded). **PostToolUse:** after `jl create`, reads the machine id from the output and registers it with LeaseGuard. Both fail open. |

## Required environment variables

Set these in the shell that launches Kepler / Claude Code:

```bash
export LEASEGUARD_URL="https://<droplet-ip>.sslip.io"   # no trailing slash
export LEASEGUARD_API_KEY="<same value as BACKEND_API_KEY in backend/.env>"
```

The hooks read them at run time. The MCP server config expands them when the plugin loads. The key is only ever sent as the `X-API-Key` header; the hooks never print it.

Hooks need `python3` on `PATH` (standard library only).

## Install in Claude Code

From the repository root:

```bash
# Option A: load for one session
claude --plugin-dir ./kepler-plugin

# Option B: install through the bundled local marketplace
claude plugin marketplace add ./kepler-plugin
claude plugin install leaseguard@leaseguard-local
```

Check it loaded: `/plugin` should list `leaseguard`, and `/mcp` should show the `leaseguard` server as connected.

Validate after editing: `claude plugin validate ./kepler-plugin`.

## Install in Kepler

Kepler's release notes (v0.1.9-beta) say it installs plugins from a GitHub repo, a git link or a folder, and that plugins made for Claude Code install too. Before installing it shows the exact commands its hooks and servers will run.

1. Open **Settings → Customize → Plugins** (or type `/plugins` in chat).
2. Choose install from **folder** and select `kepler-plugin/`, or from **git** with this repository.
3. Approve the hooks and the `leaseguard` tool server after reviewing them.
4. Make sure `LEASEGUARD_URL` and `LEASEGUARD_API_KEY` are visible to Kepler. If Kepler prompts for plugin secrets, it stores them in the system keychain.

### Telegram `/triage` flow

1. Add both the LeaseGuard bot and Kepler's Telegram bot to the same group.
2. In Kepler's Gateway, add the Telegram channel and create an automation with the chat trigger `/triage` that runs this plugin's `triage` command with the message argument.
3. When LeaseGuard posts "Run run-123 looks stalled", type `/triage run-123` in the group.

> **Not yet verified:** Kepler compatibility for Claude Code–format plugins, its chat-trigger automations, and how it names plugin MCP tools come from Kepler's release notes, not from testing. Try them first at the event.
>
> **Fallback:** run the same plugin in Claude Code on a laptop (`claude --plugin-dir ./kepler-plugin`) and demo `/leaseguard:triage run-123` there. The MCP tools and commands are identical.
