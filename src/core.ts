import express from "express";
import expressWs from "express-ws";
import http from "http";
import { createServer, Server } from "net";
import pkg from "../package.json";

export type HostAddressInfo = {
  port: number;
  hostname?: string;
};

export type WebServerOptions = HostAddressInfo & {
  callback?: (server: http.Server) => void;
};

export type TcpServerOptions = HostAddressInfo & {
  callback?: (server: Server) => void;
};

export type WebServer = expressWs.Application & { server: http.Server };

export const createWebServer = (opt: WebServerOptions): WebServer => {
  const app: express.Application = express();

  // extend express app with app.ws()
  expressWs(app, undefined, {
    wsOptions: {
      perMessageDeflate: false,
    },
  });

  // serve static files
  app.use(express.static("public"));

  // set the view engine to ejs
  app.set("view engine", "ejs");

  // set route for version
  app.get("/version", (_, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        name: pkg.name,
        version: pkg.version,
      })
    );
  });

  const cb = () => {
    opt.callback && opt.callback(server);
  };

  const server = opt.hostname
    ? app.listen(opt.port, opt.hostname, cb)
    : app.listen(opt.port, cb);

  (app as WebServer).server = server;

  return app as WebServer;
};

export const createTcpServer = (opt: TcpServerOptions) => {
  const server = createServer();
  server.listen(opt.port, opt.hostname, () => {
    opt.callback && opt.callback(server);
  });
  return server;
};
