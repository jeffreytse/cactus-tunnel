import { RequestHandler } from "express";
import { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { Server, Socket } from "net";
import pump from "pump";
import {
  createTcpServer,
  createWebServer,
  HostAddressInfo,
  TcpServerOptions,
  WebServer,
  WebServerOptions,
} from "./core";
import { BridgeCtrlData } from "./bridge";
import { sleep, createLogger, LoggerOptions, assignDeep } from "./utils";
import net from "net";
import open from "open";
import winston from "winston";

type ClientOptions = {
  listen: HostAddressInfo;
  server: string;
  target: string;
  bridge?: HostAddressInfo;
  logger?: LoggerOptions;
  callback?: (server?: net.Server) => void;
};

type ClientMeta = {
  tcpServer: Server | null;
  clients: Socket[];
  bridge: {
    ctrl: WebSocketStream.WebSocket | null;
    data: WebSocketStream.WebSocket | null;
    origin: string;
    status: "preparing" | "waiting" | "connected";
  };
  mode: "direct" | "bridge";
};

export interface IClient {
  options: ClientOptions;
  logger: winston.Logger;
  app: WebServer | null;
  meta: ClientMeta;
  tcpConnectionHandler(local: Socket): void;
  closeProxyServer(callback?: (err?: Error) => void): void;
  createProxyServer(opt: TcpServerOptions): net.Server;
  ctrlHandler: WebsocketRequestHandler;
  dataHandler: WebsocketRequestHandler;
  pageHandler: RequestHandler;
  isBridgeOpened(): boolean;
  getBridgeUrl(): string;
  autoOpenBridge(url: string, retries: number): void;
  createBridge(opt: WebServerOptions): WebServer;
  close(callback?: (err?: Error) => void): void;
  create(opt: ClientOptions): void;
}

export const formConnStr = (proxyServer: string, proxyTarget: string) => {
  proxyServer += proxyServer.slice(-1) === "/" ? "" : "/";
  const encodedTarget = encodeURIComponent(proxyTarget);
  return `${proxyServer}tunnel?target=${encodedTarget}`;
};

class Client implements IClient {
  options: ClientOptions = {
    listen: {
      port: -1,
    },
    bridge: {
      port: -1,
    },
    logger: {
      level: "info",
      silent: true,
    },
    server: "",
    target: "",
  };

  logger = createLogger({ label: "cactus-tunnel:client" });

  app: WebServer | null = null;

  meta: ClientMeta = {
    tcpServer: null,
    clients: [],
    bridge: {
      ctrl: null,
      data: null,
      origin: "",
      status: "preparing",
    },
    mode: "direct",
  };

  constructor(options: ClientOptions) {
    this.create(options);
  }

  tcpConnectionHandler = async (local: Socket) => {
    this.logger.info("new client connection...");

    let remote: WebSocketStream.WebSocketDuplex | null = null;

    const connStr = formConnStr(this.options.server, this.options.target);
    this.logger.info(`connecting to remote target: ${connStr}`);

    // handle connection according to proxy mode
    if (this.meta.mode === "bridge") {
      // check if bridge ctrl and data tunnel are connected
      if (!this.meta.bridge.ctrl || !this.meta.bridge.data) {
        this.logger.info("waiting for the bridge ctrl and data tunnel...");
        while (!this.meta.bridge.ctrl || !this.meta.bridge.data) {
          await sleep(50);
        }
      }

      remote = WebSocketStream(this.meta.bridge.data, {
        // websocket-stream options here
        binary: true,
      });

      const ctrlData: BridgeCtrlData = {
        type: "connect",
        data: { connStr },
      };

      this.logger.info("waiting for the bridge to establish tunnel...");

      this.meta.bridge.ctrl.send(JSON.stringify(ctrlData));

      while (this.meta.bridge.status === "waiting") {
        await sleep(50);
      }
    } else {
      remote = WebSocketStream(connStr, {
        binary: true,
      });
    }

    this.meta.clients.push(local);

    local
      .on("error", (err?: Error) => {
        remote?.destroy();
        if (err) this.logger.error(err?.message);
      })
      .on("close", () => {
        this.meta.clients.splice(this.meta.clients.indexOf(local), 1);
        this.logger.info("client connection closed!");
      });

    remote
      .on("error", (err?: Error) => {
        if (err) this.logger.error(err?.message);
      })
      .on("close", () => {
        local.destroy();
      });

    const pipe = () => {
      const onError: pump.Callback = (err?: Error) => {
        if (err) this.logger.error(err);
      };

      if (!remote) {
        return;
      }

      this.logger.info("remote target connected!");

      pump(remote, local, onError);
      pump(local, remote, onError);
    };

    pipe();
  };

  closeProxyServer = (callback?: (err?: Error) => void) => {
    this.meta.clients.forEach((client) => client.destroy());
    this.meta.clients = [];
    this.meta.tcpServer?.close(callback);
    this.meta.tcpServer?.unref();
    this.meta.tcpServer = null;
  };

  createProxyServer = (opt: TcpServerOptions) => {
    // destroy old proxy server
    if (this.meta.tcpServer) {
      this.closeProxyServer(() => {
        this.logger.info("closed old proxy server");
      });
    }

    // create TCP proxy server
    const server = createTcpServer({
      port: opt.port,
      hostname: opt.hostname,
      callback: (server: Server) => {
        const addressInfo = server?.address();
        if (typeof addressInfo !== "string") {
          this.logger.info(
            `TCP Server listen at tcp://${addressInfo?.address}:${addressInfo?.port}`
          );
        }
        opt.callback && opt.callback(server);
      },
    });
    server.on("connection", (local) => {
      this.tcpConnectionHandler(local);
    });

    this.meta.tcpServer = server;

    return server;
  };

  ctrlHandler: WebsocketRequestHandler = (ws, req) => {
    if (this.meta.bridge.ctrl) {
      this.meta.bridge.ctrl.close();
    }

    this.meta.bridge.ctrl = ws;
    this.meta.bridge.origin = req.headers.origin || "";
    this.meta.bridge.status = this.meta.bridge.data ? "waiting" : "preparing";

    ws.on("close", () => {
      this.meta.bridge.ctrl = null;
      this.meta.bridge.status = "preparing";
      this.logger.info("bridge ctrl tunnel disconnected!");
    });

    ws.on("message", (data: string) => {
      const ctrlData: BridgeCtrlData = JSON.parse(data);
      switch (ctrlData.type) {
        case "connected":
          this.meta.bridge.status = "connected";
          this.logger.info("target tunnel connected!");
          break;
      }
    });

    this.logger.info("bridge ctrl tunnel connected!");
  };

  dataHandler: WebsocketRequestHandler = (ws) => {
    if (this.meta.bridge.data) {
      this.meta.bridge.data.close();
    }

    this.meta.bridge.data = ws;
    this.meta.bridge.status = this.meta.bridge.ctrl ? "waiting" : "preparing";

    ws.on("close", () => {
      this.meta.bridge.data = null;
      this.meta.bridge.status = "preparing";
      this.logger.info("bridge data tunnel disconnected!");
    });

    this.logger.info("bridge data tunnel connected!");
  };

  pageHandler: RequestHandler = (_, res) => {
    res.render("index");
  };

  isBridgeOpened = () => {
    return this.meta.bridge.status !== "preparing";
  };

  getBridgeUrl = () => {
    const hostname = this.options.bridge?.hostname || "localhost";
    return `http://${hostname}:${this.options.bridge?.port}`;
  };

  autoOpenBridge = async (url = this.getBridgeUrl(), retries = 6) => {
    let time = 0;
    while (!this.isBridgeOpened() && ++time < retries) {
      await sleep(500);
    }
    if (!this.isBridgeOpened()) {
      this.logger.info(`auto opening bridge ${url}`);
      open(url);
      return true;
    }
    return false;
  };

  createBridge = (opt: WebServerOptions) => {
    const app = createWebServer({
      port: opt.port,
      hostname: opt.hostname,
      callback: (server) => {
        const addressInfo = server?.address();
        if (typeof addressInfo !== "string") {
          this.logger.info(
            `Tunnel Bridge listening at http://${addressInfo?.address}:${addressInfo?.port}`
          );
        }
        opt.callback && opt.callback(server);
      },
    });
    app.ws("/ctrl", this.ctrlHandler);
    app.ws("/data", this.dataHandler);
    app.get("/", this.pageHandler);
    return app;
  };

  close = (callback?: (err?: Error) => void) => {
    this.logger.info("tunnel client is closing...");
    const cb = (err?: Error) => {
      this.logger.info("tunnel client closed");
      callback && callback(err);
    };
    this.closeProxyServer(() => {
      if (!this.app) {
        cb();
        return;
      }
      this.app.server.close(cb);
      this.app.server.unref();
    });
  };

  create = (opt: ClientOptions) => {
    assignDeep(this.options, opt);
    if (this.options.logger?.level !== undefined) {
      this.logger.level = this.options.logger.level;
    }
    if (this.options.logger?.silent !== undefined) {
      this.logger.silent = this.options.logger.silent;
    }

    if (opt.bridge) {
      this.meta.mode = "bridge";
    }

    this.createProxyServer({
      ...opt.listen,
      callback: (server) => {
        // check if enable the bridge
        if (!opt.bridge) {
          opt.callback && opt.callback(server);
          return;
        }
        this.app = this.createBridge({
          ...opt.bridge,
          callback: () => {
            opt.callback && opt.callback(server);
          },
        });
      },
    });

    this.logger.info(`tunnel mode: ${this.meta.mode}`);
  };
}

export default Client;
