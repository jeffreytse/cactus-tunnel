# Cactus Tunnel - CLI Reference Manual

## Usage

```
cactus-tunnel <command> [options]
```

## Commands

| Command | Description |
|---------|-------------|
| `client <server> <target>` | Run in client mode |
| `server` | Run in server mode |
| `help [command]` | Show help |

---

## `client`

Run cactus-tunnel in client mode. Listens for local TCP connections and forwards them through the tunnel.

```
cactus-tunnel client [options] <server> <target>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `server` | Tunnel server WebSocket URL (e.g. `ws://host:7800`). Pass empty string `""` to enable bridge mode. |
| `target` | Target host and port to connect to (e.g. `ssh-server:22`). |

### Options

| Flag | Default | Env var | Description |
|------|---------|---------|-------------|
| `-p, --port <port>` | `7700` | `CT_CLIENT_PORT` | Local listening port |
| `-h, --hostname <address>` | `127.0.0.1` | `CT_CLIENT_HOSTNAME` | Local listening hostname |
| `-b, --bridge-mode` | `false` | — | Enable bridge mode (requires a browser to relay traffic) |
| `-nb, --no-browser` | — | — | Disable auto-opening the browser in bridge mode |
| `-bp, --bridge-port <port>` | `7900` | `CT_BRIDGE_PORT` | Bridge web server listening port |
| `-bh, --bridge-hostname <address>` | `0.0.0.0` | `CT_BRIDGE_HOSTNAME` | Bridge web server listening hostname |
| `-v, --verbose` | `false` | — | Enable verbose logging |
| `--help` | — | — | Show help |

### Modes

**Direct mode** — client connects directly to the tunnel server over WebSocket.

```
[local TCP app] → [cactus-tunnel client] → [WebSocket] → [cactus-tunnel server] → [target]
```

**Bridge mode** — client opens a web UI in the browser; the browser acts as the WebSocket relay.

```
[local TCP app] → [cactus-tunnel client] → [Browser WebSocket] → [cactus-tunnel server] → [target]
```

Pass an empty string for `<server>` to activate bridge mode, or use `-b`.

---

## `server`

Run cactus-tunnel in server mode. Accepts WebSocket connections from clients and proxies TCP traffic to targets.

```
cactus-tunnel server [options]
```

### Options

| Flag | Default | Env var | Description |
|------|---------|---------|-------------|
| `-p, --port <port>` | `7800` | `CT_SERVER_PORT` | Listening port |
| `-h, --hostname <address>` | `0.0.0.0` | `CT_SERVER_HOSTNAME` | Listening hostname |
| `-v, --verbose` | `false` | — | Enable verbose logging |
| `--help` | — | — | Show help |

---

## Environment Variables

Environment variables set default values for all port and hostname options. CLI flags override them.

| Variable | Default | Description |
|----------|---------|-------------|
| `CT_CLIENT_PORT` | `7700` | Client listening port |
| `CT_CLIENT_HOSTNAME` | `127.0.0.1` | Client listening hostname |
| `CT_SERVER_PORT` | `7800` | Server listening port |
| `CT_SERVER_HOSTNAME` | `0.0.0.0` | Server listening hostname |
| `CT_BRIDGE_PORT` | `7900` | Bridge web server port |
| `CT_BRIDGE_HOSTNAME` | `0.0.0.0` | Bridge web server hostname |

---

## Examples

### Start a server

```sh
cactus-tunnel server
```

Listens on `0.0.0.0:7800` by default.

```sh
cactus-tunnel server --port 9000 --hostname 0.0.0.0
```

### Direct mode — proxy a remote port locally

Forward `localhost:7700` → tunnel server → `target-host:22`:

```sh
cactus-tunnel client ws://tunnel-server:7800 target-host:22
```

Then connect via the local port:

```sh
ssh -p 7700 user@localhost
```

### Bridge mode — SSH SOCKS5 proxy through a browser

Start the client in bridge mode:

```sh
cactus-tunnel client "" your-ssh-server:22 --bridge-mode
```

The browser opens automatically at `http://localhost:7900` and acts as the WebSocket relay.

Open an SSH SOCKS5 proxy through the tunnel:

```sh
ssh -p 7700 -D 3128 -C -N user@localhost
```

Configure your system or browser to use `localhost:3128` as a SOCKS5 proxy.

### Bridge mode — request an external HTTP API

```sh
cactus-tunnel client "" ip-api.com:80 --bridge-mode
```

Then:

```sh
curl http://localhost:7700/json/8.8.8.8
```

### Suppress browser auto-open

```sh
cactus-tunnel client "" target:22 --bridge-mode --no-browser
```

### Override defaults with environment variables

```sh
CT_CLIENT_PORT=8080 CT_SERVER_PORT=9000 cactus-tunnel client ws://server:9000 target:22
```
