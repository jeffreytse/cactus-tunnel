import express from "express";
import expressWs from "express-ws";
import { createLogger } from "./utils";

const logger = createLogger({ label: "cactus-tunnel:core" });

export const createWebServer = function (port: number): expressWs.Application {
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

  app.listen(port, () => {
    logger.info(`listening on port ${port}`);
  });

  return app as expressWs.Application;
};
