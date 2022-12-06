import express from "express";
import expressWs from "express-ws";
import http from "http";
import pkg from "../package.json";

export type HostAddressInfo = {
  port: number;
  hostname?: string;
};

export const createWebServer = function (
  opt: HostAddressInfo & {
    callback?: (server: http.Server) => void;
  }
): expressWs.Application {
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

  return app as expressWs.Application;
};
