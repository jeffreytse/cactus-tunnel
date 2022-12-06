import { createClient, createServer } from "../src/";
import config from "../src/config";
import pkg from "../package.json";
import { describe, it } from "mocha";
import assert from "assert";
import axios from "axios";
import { sleep } from "../src/utils";

describe("suites for tunnel modes", function () {
  before(function () {
    this.refs = {
      // Create tunnel server
      server: createServer({
        listen: config.server,
      }),
    };
  });

  after(function () {
    // will be executed
    this.refs.server.close();
    setTimeout(() => process.exit(0), 500);
  });

  afterEach(function () {
    // will be executed
    this.refs.client.close();
  });

  describe("establish tunnel in direct mode", function () {
    it(`should return ${pkg.name} when the tunnel `, async function () {
      // Create tunnel client in direct mode
      this.refs.client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
      });

      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );

      assert.equal(res.data.name, pkg.name);
    });
  });

  describe("establish tunnel in bridge mode", function () {
    this.timeout(15000);

    it(`should return ${pkg.name} when the tunnel established`, async function () {
      // Create tunnel client in bridge mode
      this.refs.client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        bridge: {
          port: config.bridge.port,
        },
      });

      if (await this.refs.client.autoOpenBridge()) {
        while (!this.refs.client.isBridgeOpened()) {
          await sleep(500);
        }
      }

      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );

      assert.equal(res.data.name, pkg.name);
    });
  });
});
