import commander from "commander";
import cactusTunnel from "./";
import config from "./config";
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
  .option(
    "-b, --bridge-mode",
    "enable tunnel bridge mode",
  )
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
  .action((server, target, options) => {
    cactusTunnel.createClient({
      listen: {
        port: options.port,
        hostname: options.hostname,
      },
      bridge: options.bridgeMode ? {
        port: options.bridgePort,
        hostname: options.bridgeHostname,
      } : undefined,
      server,
      target,
    });
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
  .action((options) => {
    cactusTunnel.createServer({
      listen: {
        port: options.port,
        hostname: options.hostname,
      },
    });
  });

program.parse();
