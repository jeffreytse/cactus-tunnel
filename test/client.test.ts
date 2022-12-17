import { describe, expect, test } from "@jest/globals";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";
import Client from "../src/client";

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
  });
});
