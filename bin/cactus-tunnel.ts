#!/usr/bin/env node

import commander from "commander";
import cactusTunnel from "../src/";
import config from "../src/config";
import pkg from "../package.json";

const program = new commander.Command();

program.name(pkg.name).description(pkg.description).version(pkg.version);

const myParseInt = (value: string) => {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError("Not a number.");
  }
  return parsedValue;
};

program
  .command("client")
  .description(`runs ${pkg.name} in client mode`)
  .argument(
    "<server>",
    "tunnel server url, empty is bridge mode e.g. ws://your-tunnel-server:7800"
  )
  .argument("<target>", "tunnel target url, e.g. your-linux-ssh-server:22")
  .option(
    "-p, --port <port>",
    "tunnel client listening port",
    myParseInt,
    config.client.port
  )
  .option(
    "-h, --hostname <address>",
    "tunnel client listening hostname",
    config.client.hostname
  )
  .option("-b, --bridge-mode", "enable tunnel bridge mode")
  .option("-nb, --no-browser", "disable auto open browser when in bridge mode")
  .option(
    "-bp, --bridge-port <port>",
    "tunnel bridge listening port",
    myParseInt,
    config.bridge.port
  )
  .option(
    "-bh, --bridge-hostname <address>",
    "tunnel bridge listening hostname",
    config.bridge.hostname
  )
  .option("-v, --verbose", "enable verbose output")
  .action((server, target, options) => {
    const client = cactusTunnel.createClient({
      listen: {
        port: options.port,
        hostname: options.hostname,
      },
      bridge: options.bridgeMode
        ? {
            port: options.bridgePort,
            hostname: options.bridgeHostname,
          }
        : undefined,
      server,
      target,
      logger: {
        silent: options.verbose ? false : true,
      },
    });
    console.info(
      `client listening on: tcp://${options.hostname}:${options.port}`
    );
    if (options.bridgeMode) {
      const url = `http://${options.bridgeHostname}:${options.bridgePort}`;
      console.info(`bridge listening on: ${url}`);
      if (!options.noBrowser) {
        client.autoOpenBridge(url);
      }
    }
  });

program
  .command("server")
  .description(`runs ${pkg.name} in server mode`)
  .option(
    "-p, --port <port>",
    "tunnel server listening port",
    myParseInt,
    config.server.port
  )
  .option(
    "-h, --hostname <address>",
    "tunnel server listening hostname",
    config.server.hostname
  )
  .option("-v, --verbose", "enable verbose output")
  .action((options) => {
    cactusTunnel.createServer({
      listen: {
        port: options.port,
        hostname: options.hostname,
      },
      logger: {
        silent: options.verbose ? false : true,
      },
    });
    console.info(
      `server listening on: http://${options.hostname}:${options.port}`
    );
  });

program.parse();
