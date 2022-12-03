import express from "express";
import expressWs from "express-ws";
import http from "http";

export const createWebServer = function (opt: {
  port: number;
  hostname: string;
  callback?: (server: http.Server) => void
}): expressWs.Application {
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
  app.get("/version", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        version: `${process.env.npm_package_version}`,
      })
    );
  });

  const server = app.listen(opt.port, opt.hostname, () => {
    opt.callback && opt.callback(server);
  });

  return app as expressWs.Application;
};
