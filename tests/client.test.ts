import { describe, expect, test } from "@jest/globals";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";
import WebSocket from "ws";
import Client from "../src/client";
import { fixAddress } from "../src/utils";

describe("tunnel client functionality", () => {

  describe("client in direct mode", () => {
    let client: Client;

    beforeEach((done) => {
      client = new Client({
        listen: config.client,
        server: `ws://${config.server.hostname}:${config.server.port}`,
        target: `${config.server.hostname}:${config.server.port}`,
        callback: () => done(),
      });
    });

    afterEach((done) => {
      client.close(done);
    });

    test("should return null when client created", () => {
      expect(client.app).toBeNull();
    });

    test("closeProxyServer fires callback when tcpServer is null", (done) => {
      const server = client.meta.tcpServer;
      client.meta.tcpServer = null;
      client.closeProxyServer(() => {
        server?.close(() => {
          server.unref();
          done();
        });
      });
    });
  });

  describe("client in bridge mode", () => {
    let client: Client;

    beforeEach((done) => {
      client = new Client({
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

    test(`should return a bridge instance when client created`, () => {
      expect(client.app).toBeDefined();
    });

    test(`should return ${pkg.name} when client created`, async () => {
      const res = await axios.get(
        `http://${config.bridge.hostname}:${config.bridge.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });

    test("isBridgeOpened() is false before ctrl/data connect", () => {
      expect(client.isBridgeOpened()).toBe(false);
    });

    test("isBridgeOpened() is true after ctrl and data connect", (done) => {
      const bridgeBase = `ws://${fixAddress(config.bridge.hostname)}:${config.bridge.port}`;
      const ctrlWs = new WebSocket(`${bridgeBase}/ctrl`);
      const dataWs = new WebSocket(`${bridgeBase}/data`);

      let ctrlOpen = false;
      let dataOpen = false;
      const check = () => {
        if (!ctrlOpen || !dataOpen) return;
        setTimeout(() => {
          expect(client.isBridgeOpened()).toBe(true);
          ctrlWs.close();
          dataWs.close();
          done();
        }, 100);
      };
      ctrlWs.on("open", () => { ctrlOpen = true; check(); });
      dataWs.on("open", () => { dataOpen = true; check(); });
    });
  });
});
