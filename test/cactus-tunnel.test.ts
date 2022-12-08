import { describe, expect, test } from "@jest/globals";
import { createClient, createServer } from "../src/";
import config from "../src/config";
import pkg from "../package.json";
import { sleep } from "../src/utils";
import puppeteer from "puppeteer";
import axios from "axios";

describe("tunnel modes", () => {
  let server: ReturnType<typeof createServer>;

  beforeAll(() => {
    server = createServer({
      listen: config.server,
    });
  });

  afterAll(() => {
    server.close();
  });

  describe("#direct mode", () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
      });
    });

    afterEach(() => {
      client.close();
    });

    test(`should return ${pkg.name} when the tunnel established`, async () => {
      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });
  });

  describe("#bridge mode", () => {
    let client: ReturnType<typeof createClient>;

    beforeEach(() => {
      client = createClient({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        bridge: {
          port: config.bridge.port,
        },
      });
    });

    afterEach(() => {
      client.close();
    });

    test(`should return ${pkg.name} when the tunnel established`, async () => {
      // create tunnel bridge
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(client.getBridgeUrl());

      while (!client.isBridgeOpened()) {
        await sleep(100);
      }

      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );

      await browser.close();

      expect(res.data.name).toBe(pkg.name);
    });
  });
});
