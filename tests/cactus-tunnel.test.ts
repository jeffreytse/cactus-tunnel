import { describe, expect, test } from "@jest/globals";
import cactusTunnel from "../src/";
import config from "../src/config";
import pkg from "../package.json";
import { sleep } from "../src/utils";
import puppeteer from "puppeteer";
import axios from "axios";
import { IClient } from "../src/client";
import { IServer } from "../src/server";

describe("tunnel modes", () => {
  let server: IServer;

  beforeAll((done) => {
    server = new cactusTunnel.Server({
      listen: config.server,
      callback: () => done(),
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("direct mode", () => {
    let client: IClient;

    beforeEach((done) => {
      client = new cactusTunnel.Client({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        callback: () => done(),
      });
    });

    afterEach((done) => {
      client.close(done);
    });

    test(`should return ${pkg.name} when the tunnel established`, async () => {
      const res = await axios.get(
        `http://${config.client.hostname}:${config.client.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });
  });

  describe("bridge mode", () => {
    let client: IClient;

    beforeEach((done) => {
      client = new cactusTunnel.Client({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        bridge: {
          port: config.bridge.port,
          hostname: config.bridge.hostname,
        },
        callback: () => done(),
      });
    });

    afterEach((done) => {
      client.close(done);
    });

    test(`should return ${pkg.name} when the tunnel established`, async () => {
      const browser = await puppeteer.launch();
      try {
        // create tunnel bridge
        const page = await browser.newPage();

        page.on("console", (message) =>
          console.log(
            `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`
          )
        );

        await page.goto(client.getBridgeUrl());

        while (!client.isBridgeOpened()) {
          await sleep(100);
        }

        const res = await axios.get(
          `http://${config.client.hostname}:${config.client.port}/version`
        );

        expect(res.data.name).toBe(pkg.name);
      } catch (e) {
        console.error(e);
      } finally {
        await browser.close();
      }
    });
  });
});
