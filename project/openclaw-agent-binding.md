# OpenClaw Agent Binding

This document describes how Mission Control currently binds to an OpenClaw instance, what is actually supported today, and what to configure in Docker.

## Summary

Mission Control currently supports two launch-safe OpenClaw discovery modes:

1. `cli`
Mission Control executes an OpenClaw CLI command inside the `app` container and parses the JSON result.

2. `config_file`
Mission Control reads a mounted OpenClaw config file and parses the configured agent list.

Mission Control does **not** currently discover agents from an OpenClaw dashboard URL or Gateway URL directly.

The `dashboardUrl` field in the UI is only reference metadata today.

## Why `localhost:<port>` failed

The current OpenClaw integration is not a URL connector.

If discovery mode is `cli`, Mission Control calls:

```txt
spawn(<executable>, <arguments>)
```

The default values are:

```txt
executable: openclaw
arguments:
  agents
  list
  --json
```

So if the app container does not have the `openclaw` binary in its `PATH`, sync fails with:

```txt
spawn openclaw ENOENT
```

`ENOENT` means the executable cannot be found. It does not mean the remote OpenClaw instance is down.

## OpenClaw references

Official OpenClaw docs used for this binding:

- Configuration reference: `agents.list` comes from `openclaw.json`
  https://docs.openclaw.ai/reference/configuration
- CLI agent listing:
  https://docs.openclaw.ai/cli/agents
- Gateway protocol:
  https://docs.openclaw.ai/reference/gateway-protocol

Mission Control intentionally ships only the CLI/config-file discovery path for now. A native remote Gateway client is still future work.

## Current Mission Control fields

In `Manage Workspace -> OpenClaw`:

- `Instance label`
Human-readable label inside Mission Control.

- `Dashboard URL`
Optional reference only. Useful for operators, but not used for agent discovery.

- `Enabled`
Turns the integration on or off.

- `Discovery mode`
Either `cli` or `config_file`.

- `CLI executable`
Binary name or path used inside the Mission Control `app` container.

- `CLI arguments`
Arguments passed to that executable.

- `Config path`
Path inside the Mission Control `app` container to the mounted `openclaw.json`.

## Recommended setup

For Docker deployments, prefer `config_file`.

It is the simplest and safest launch setup because it does not require installing the OpenClaw CLI inside the Mission Control container.

### Recommended values

- `Enabled`: `true`
- `Discovery mode`: `config_file`
- `Config path`: `/workspace/openclaw/openclaw.json`

## Docker setup for `config_file`

Mount the OpenClaw config into the Mission Control `app` container.

Example production override:

```yaml
services:
  app:
    volumes:
      - /home/claw/.openclaw/openclaw.json:/workspace/openclaw/openclaw.json:ro
```

Then in Mission Control:

- open `Manage Workspace`
- go to `OpenClaw`
- set:
  - `Enabled` = on
  - `Discovery mode` = `config_file`
  - `Config path` = `/workspace/openclaw/openclaw.json`
- save
- click `Sync agents`

## Docker setup for `cli`

Use this only if the Mission Control `app` container can execute the OpenClaw CLI directly.

That means:

- the `openclaw` binary must exist inside the container
- the container must have access to the OpenClaw config and runtime context needed by the CLI

Default settings:

- `Discovery mode` = `cli`
- `CLI executable` = `openclaw`
- `CLI arguments`:

```txt
agents
list
--json
```

If the CLI is installed under a custom path, set that full path in `CLI executable`.

## Important limitation: config parsing

The OpenClaw docs describe the config as `openclaw.json`, and OpenClaw treats it as a configuration document. Mission Control currently parses the mounted file as standard JSON.

So for now:

- JSON-compatible content works
- JSON5-only features like comments or trailing commas may fail in Mission Control config-file mode

If your OpenClaw config uses JSON5-style features, either:

- provide a JSON-clean mounted copy for Mission Control, or
- use CLI mode instead

## What Mission Control syncs

On sync, Mission Control imports or updates workspace members with:

- `sourceSystem = openclaw`
- agent name
- a stable source key
- capability-like labels derived from supported fields such as capabilities, labels, tags, tools, MCP servers, and model hints

If an OpenClaw-sourced agent disappears upstream, Mission Control disables the corresponding synced agent member instead of deleting it.

## Common errors

### `spawn openclaw ENOENT`

Meaning:
- CLI mode is enabled
- Mission Control tried to execute `openclaw`
- the binary does not exist inside the `app` container

Fix:
- switch to `config_file`, or
- install/mount the CLI inside the container and point `CLI executable` at the right path

### `OpenClaw config path is required`

Meaning:
- `config_file` mode is selected but `Config path` is empty

Fix:
- provide a path inside the container, not a host-only path

### File not found / read failure on config path

Meaning:
- the file is not mounted into the container where Mission Control expects it

Fix:
- add the Docker volume mount
- use the container path in Mission Control

### Sync succeeds but no agents appear

Meaning:
- Mission Control parsed the file/command, but the discovered agent list was empty or in an unsupported shape

Fix:
- verify that `openclaw agents list --json` returns actual agent data
- verify that `openclaw.json` contains a populated `agents.list`

## What still needs future work

Mission Control does not yet support:

- native remote discovery via OpenClaw Gateway URL
- signed device-auth Gateway sessions
- JSON5 parsing for OpenClaw config-file mode
- container-aware diagnostics that validate mounts and executable presence automatically

These should remain follow-up work, not hidden assumptions.
