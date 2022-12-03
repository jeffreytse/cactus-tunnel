import { createConnection } from "net";
import http from "http";
import pump from "pump";
import url from "url";
import expressWs, { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { createLogger } from "./utils";

export const logger = createLogger({ label: "cactus-tunnel:server" });

const getTunnelInfo = function (req: http.IncomingMessage) {
  const result = url.parse(req.url || "", true);
  const target = (result?.query?.target as string) || "";
  const [hostname, port] = target.split(":");

  if (isNaN(parseInt(port)) || hostname.length === 0) {
    return;
  }

  return { hostname, port: +port };
};

const wsTunnelRequestHandler: WebsocketRequestHandler = function (ws, req) {
  const tunnelInfo = getTunnelInfo(req);

  if (!tunnelInfo) {
    logger.error("invalid tunnel info!");
    return;
  }

  // convert ws instance to stream
  const local = WebSocketStream(ws, {
    binary: true,
  });

  logger.info(
    "connecting to remote target: " +
      tunnelInfo.hostname +
      ":" +
      tunnelInfo.port
  );

  const remote = createConnection(tunnelInfo.port, tunnelInfo.hostname);
  remote.on("error", logger.error);

  const onStreamError: pump.Callback = (err) => {
    if (err) logger.error(err);
  };

  pump(local, remote, onStreamError);
  pump(remote, local, onStreamError);
};

export const create = function (app: expressWs.Application) {
  app.ws("/tunnel", wsTunnelRequestHandler);
  app.get("/", (_, res) => {
    res.render("index");
  });
  return app;
};

