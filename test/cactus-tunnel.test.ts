import { createClient, createServer } from "../src/";
import config from "../src/config";
import pkg from "../package.json";
import { sleep } from "../src/utils";
import { describe, it } from "mocha";
import puppeteer from "puppeteer";
import assert from "assert";
import axios from "axios";

describe("Tunnel modes", function () {
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

  describe("#direct mode", function () {
    it(`should return ${pkg.name} when the tunnel established`, async function () {
      // Create tunnel client in direct mode
      const client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
      });

      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );

      assert.equal(res.data.name, pkg.name);

      client.close();
    });
  });

  describe("#bridge mode", function () {
    this.timeout(5000);

    it(`should return ${pkg.name} when the tunnel established`, async function () {
      // Create tunnel client in bridge mode
      const client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        bridge: {
          port: config.bridge.port,
        },
      });

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(client.getBridgeUrl());

      while (!client.isBridgeOpened()) {
        await sleep(100);
      }

      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );

      assert.equal(res.data.name, pkg.name);

      client.close();
      await browser.close();
    });
  });
});
