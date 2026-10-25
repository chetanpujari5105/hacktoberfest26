---
description: Show LeaseGuard's guarded GPU runs, or one run in detail
argument-hint: "[run_id]"
allowed-tools: mcp__plugin_leaseguard_leaseguard__list_runs mcp__plugin_leaseguard_leaseguard__get_run
---

Report the state of GPU training runs guarded by LeaseGuard, using the `leaseguard` MCP server.

Arguments: `$ARGUMENTS`

- If no run id was given, call `list_runs`. Show a compact table: run id, name, machine id, status, GPU util %, latest loss, Gemma's latest verdict (action + one-line reason), and savings in INR (₹). Put runs with status `needs_triage` first and say they can be diagnosed with `/leaseguard:triage <run_id>`.
- If a run id was given, call `get_run` for it. Summarise: status, GPU util and memory, whether the training process is alive, seconds since the last log line, the latest loss and its trend, Gemma's verdict (action, reason, symptom, source), and the last 5 timeline events.

Keep it read-only: do not pause, resume, extend or resolve anything from this command. If the MCP server is unreachable, say so and remind the user to set `LEASEGUARD_URL` and `LEASEGUARD_API_KEY`.
