import { describe, expect, test } from "@jest/globals";
import { createTcpServer, createWebServer } from "../src/core";
import config from "../src/config";
import pkg from "../package.json";
import axios from "axios";

describe("core", () => {
  describe("create web server", () => {
    let app: ReturnType<typeof createWebServer>;

    beforeAll((done) => {
      app = createWebServer({
        ...config.server,
        callback: () => done(),
      });
    });

    afterAll((done) => {
      app.server.close(done);
    });

    test(`should return an app instance`, () => {
      expect(app).toBeDefined();
    });

    test(`should listen at address http://${config.server.hostname}:${config.server.port}`, () => {
      const address = app.server.address();
      expect(address).toMatchObject({
        address: config.server.hostname,
        port: config.server.port,
      });
    });

    test(`should serve route "/version"`, async () => {
      const res = await axios.get(
        `http://${config.server.hostname}:${config.server.port}/version`
      );
      expect(res.data.name).toBe(pkg.name);
    });
  });

  describe("create tcp server", () => {
    let app: ReturnType<typeof createTcpServer>;

    beforeAll((done) => {
      app = createTcpServer({
        ...config.server,
        callback: () => done(),
      });
    });

    afterAll((done) => {
      app.close(done);
    });

    test(`should return an app instance`, () => {
      expect(app).toBeDefined();
    });

    test(`should listen at address tcp://${config.server.hostname}:${config.server.port}`, () => {
      const address = app.address();
      expect(address).toMatchObject({
        address: config.server.hostname,
        port: config.server.port,
      });
    });
  });
});
