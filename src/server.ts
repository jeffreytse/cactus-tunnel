import { createConnection } from "net";
import http from "http";
import pump from "pump";
import { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { assignDeep, createLogger, LoggerOptions, parseConnStr } from "./utils";
import { createWebServer, HostAddressInfo, WebServer } from "./core";
import winston from "winston";

type ServerOptions = {
  listen: HostAddressInfo;
  logger?: LoggerOptions;
  callback?: (server: http.Server) => void;
};

export interface IServer {
  options: ServerOptions;
  logger: winston.Logger;
  app: WebServer | null;
  wsTunnelRequestHandler: WebsocketRequestHandler;
  close(callback?: (err?: Error) => void): void;
  create(opt: ServerOptions): void;
}

class Server {
  options: ServerOptions = {
    listen: {
      port: -1,
    },
    logger: {
      level: "info",
      silent: true,
    },
  };

  logger = createLogger({ label: "cactus-tunnel:server" });

  app: WebServer | null = null;

  constructor(options: ServerOptions) {
    this.create(options);
  }

  wsTunnelRequestHandler: WebsocketRequestHandler = (ws, req) => {
    const remoteIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    this.logger.info(`client request from: ${remoteIP}`);

    const tunnelInfo = parseConnStr(req.url);

    if (!tunnelInfo) {
      this.logger.error("invalid tunnel info!");
      return;
    }

    // convert client ws instance to stream
    const client = WebSocketStream(ws, {
      binary: true,
    });

    this.logger.info(
      "connecting to remote target: " +
        tunnelInfo.hostname +
        ":" +
        tunnelInfo.port
    );

    const remote = createConnection(tunnelInfo.port, tunnelInfo.hostname);

    client
      .on("error", (err?: Error) => {
        if (err) this.logger.error(err.message);
      })
      .on("close", () => {
        remote.end(() => remote.destroy());
        this.logger.info("client connection closed!");
      });

    remote
      .on("error", (err?: Error) => {
        if (err) this.logger.error(err.message);
      })
      .on("close", () => {
        client.end(() => client.destroy());
        this.logger.info("remote connection closed!");
      });

    const pipe = () => {
      const onStreamError: pump.Callback = (err) => {
        if (err) this.logger.error(err);
      };

      pump(client, remote, onStreamError);
      pump(remote, client, onStreamError);
    };

    pipe();
  };

  close = (callback?: (err?: Error) => void) => {
    this.logger.info("tunnel server is closing...");
    this.app?.server.close((err?: Error) => {
      this.logger.info("tunnel server closed!");
      this.app?.server.unref();
      callback && callback(err);
    });
  };

  create = (opt: ServerOptions) => {
    this.options = assignDeep(this.options, opt) as ServerOptions;

    if (this.options.logger?.level !== undefined) {
      this.logger.level = this.options.logger.level;
    }
    if (this.options.logger?.silent !== undefined) {
      this.logger.silent = this.options.logger.silent;
    }

    const app = createWebServer({
      ...opt.listen,
      callback: (server) => {
        const addressInfo = server?.address();
        if (typeof addressInfo !== "string") {
          this.logger.info(
            `Tunnel Server running at http://${addressInfo?.address}:${addressInfo?.port}`
          );
        }
        opt.callback && opt.callback(server);
      },
    });
    app.ws("/tunnel", this.wsTunnelRequestHandler);

    this.app = app;
  };
}

export default Server;
