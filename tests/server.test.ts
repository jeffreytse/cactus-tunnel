import { describe, expect, test } from "@jest/globals";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";
import WebSocket from "ws";
import Server from "../src/server";
import { fixAddress } from "../src/utils";

describe("tunnel server functionality", () => {
  describe("server", () => {
    let server: Server;

    beforeEach((done) => {
      server = new Server({
        listen: config.server,
        callback: () => done(),
      });
    });

    afterEach((done) => {
      server.close(done);
    });

    test(`should return an instance when server created`, () => {
      expect(server.app).toBeDefined();
    });

    test(`should return ${pkg.name} when server created`, async () => {
      const res = await axios.get(
        `http://${fixAddress(config.server.hostname)}:${config.server.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });

    test("should close WS when tunnel target is missing", (done) => {
      const ws = new WebSocket(
        `ws://${fixAddress(config.server.hostname)}:${config.server.port}/tunnel`
      );
      ws.once("close", () => done());
    });

    test("should close WS when tunnel target has no port", (done) => {
      const ws = new WebSocket(
        `ws://${fixAddress(config.server.hostname)}:${config.server.port}/tunnel?target=localhost`
      );
      ws.once("close", () => done());
    });
  });
});
