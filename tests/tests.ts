import CactusTunnel from "../src/";
import { sleep } from "../src/utils";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";
import open from "open";

// Create tunnel server
CactusTunnel.createServer({ listen: config.server });

// Create tunnel client in bridge mode
const client = CactusTunnel.createClient({
  listen: config.client,
  server: `ws://${config.server.hostname}:${config.server.port}`,
  target: `${config.server.hostname}:${config.server.port}`,
  bridge: {
    port: config.bridge.port,
  },
});

const test = async () => {
  // waiting for the bridge to connect to client
  let time = 0;
  while (client.getBridgeStatus() !== "waiting") {
    await sleep(100);
    if (15 === ++time) {
      open(`http://${config.bridge.hostname}:${config.bridge.port}`);
    }
  }

  axios
    .get(`http://${config.client.hostname}:${config.client.port}/version`)
    .then((res) =>
      console.assert(
        res.data.version === pkg.version,
        `the version ${res.data.version} doesn't match to ${pkg.version}`
      )
    )
    .catch((err) => console.error(err))
    .finally(() => process.exit(0));
};

test();
