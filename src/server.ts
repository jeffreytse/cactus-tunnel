import { createConnection } from "net";
import http from "http";
import pump from "pump";
import url from "url";
import { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { assignDeep, createLogger, LoggerOptions } from "./utils";
import { createWebServer, HostAddressInfo } from "./core";

export const logger = createLogger({ label: "cactus-tunnel:server" });

type ServerOptions = {
  listen: HostAddressInfo;
  logger?: LoggerOptions;
};

const serverOptions: ServerOptions = {
  listen: {
    port: -1,
  },
  logger: {
    level: "info",
    silent: true,
  },
};

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
  const remoteIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  logger.info(`client request from: ${remoteIP}`);

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

export const create = function (opt: ServerOptions) {
  assignDeep(serverOptions, opt);

  if (serverOptions.logger?.level !== undefined) {
    logger.level = serverOptions.logger.level;
  }
  if (serverOptions.logger?.silent !== undefined) {
    logger.silent = serverOptions.logger.silent;
  }

  const app = createWebServer({
    ...opt.listen,
    callback: (server) => {
      const addressInfo = server?.address();
      if (typeof addressInfo === "string") {
        return;
      }
      logger.info(
        `Tunnel Server running on http://${addressInfo?.address}:${addressInfo?.port}`
      );
    },
  });
  app.ws("/tunnel", wsTunnelRequestHandler);

  const close = () => app.get("server")?.close();

  return {
    app,
    close,
    opt: serverOptions,
  };
};
