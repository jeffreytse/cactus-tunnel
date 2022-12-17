import { describe, expect, test } from "@jest/globals";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";
import Server from "../src/server";

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
        `http://${config.server.hostname}:${config.server.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });
  });
});
