import expressWs, { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { createServer, Server, Socket } from "net";
import url from "url";
import pump from "pump";
import { BridgeCtrlData } from "./bridge";
import { sleep, createLogger } from "./utils";
import config from "./config";

export const logger = createLogger({ label: "cactus-tunnel:client" });

type Proxy = {
  port: number;
  hostname?: string;
  server: string;
  target: string;
  tcpServer: Server | null;
  clients: Socket[];
  bridge: {
    origin: string;
    ctrl: WebSocketStream.WebSocket | null;
    data: WebSocketStream.WebSocket | null;
    status: "waiting" | "connected";
  };
  mode: "default" | "bridge";
};

const proxy: Proxy = {
  port: config.client.port,
  hostname: config.client.hostname,
  server: config.client.server,
  target: config.client.target,
  tcpServer: null,
  clients: [],
  bridge: {
    origin: "",
    ctrl: null,
    data: null,
    status: "waiting",
  },
  mode: "default",
};

const formConnStr = (proxyServer: string, proxyTarget: string) => {
  proxyServer += proxyServer.slice(-1) === "/" ? "" : "/";
  const encodedTarget = encodeURIComponent(proxyTarget);
  return `${proxyServer}tunnel?target=${encodedTarget}`;
};

const tcpConnectionHandler: (local: Socket) => void = async (local) => {
  logger.info("beginning new client connection...");

  local.on("close", () => {
    logger.info("client connection was closed!");
    proxy.clients.splice(proxy.clients.indexOf(local), 1);
  });

  proxy.clients.push(local);

  let remote: WebSocketStream.WebSocketDuplex | null = null;

  // handle connection according to proxy mode
  if (proxy.mode === "bridge") {
    logger.info("waiting for bridge ctrl and data tunnel...");

    while (!proxy.bridge.ctrl || !proxy.bridge.data) {
      await sleep(50);
    }

    remote = WebSocketStream(proxy.bridge.data, {
      // websocket-stream options here
      binary: true,
    });

    logger.info("bridge ctrl and data tunnel was created!");

    let proxyServer = proxy.server;
    let proxyTarget = proxy.target;
    const result = url.parse(proxy.bridge.origin, true);

    if (proxyServer === "auto") {
      proxyServer = `ws://${result.hostname}:${result.port}` || "";
    }

    if (proxyTarget === "auto") {
      proxyTarget = `${result.hostname}:22`;
    }

    const connStr = formConnStr(proxyServer, proxyTarget);
    const ctrlData: BridgeCtrlData = {
      type: "connect",
      data: { connStr },
    };

    proxy.bridge.ctrl.send(JSON.stringify(ctrlData));

    logger.info(`connecting to remote target: ${connStr}`);

    while (proxy.bridge.status === "waiting") {
      await sleep(50);
    }
  } else {
    const connStr = formConnStr(proxy.server, proxy.target);
    logger.info(`connecting to remote target: ${connStr}`);
    remote = WebSocketStream(connStr, {
      binary: true,
    });
  }

  const pipe = () => {
    const onError: pump.Callback = (err) => {
      if (err) logger.error(err);
    };

    if (!remote) {
      return;
    }

    pump(remote, local, onError);
    pump(local, remote, onError);
  };

  // pipe stream after remote websocket stream connected
  setTimeout(pipe, 100);
};

const createProxyServer = (opt: { port: number; hostname?: string }) => {
  // destroy old proxy server
  if (proxy.tcpServer) {
    proxy.clients.forEach((client) => client.destroy());
    proxy.clients = [];
    proxy.tcpServer.close(() => {
      logger.info("closed old proxy server");
      proxy.tcpServer?.unref();
      proxy.tcpServer = null;
      createProxyServer(opt);
    });
    return;
  }

  // Create TCP proxy server
  const server = createServer();
  proxy.tcpServer = server;
  server.on("connection", (local) => {
    tcpConnectionHandler(local);
  });
  server.listen(opt.port, opt.hostname, () => {
    const addressInfo = server?.address();
    if (typeof addressInfo === "string") {
      return;
    }
    logger.info(
      `TCP Server running at tcp://${addressInfo?.address}:${addressInfo?.port}`
    );
  });
};

const ctrlHandler: WebsocketRequestHandler = (ws, req) => {
  if (proxy.bridge.ctrl) {
    proxy.bridge.ctrl.close();
  }

  proxy.bridge.ctrl = ws;
  proxy.bridge.origin = req.headers.origin || "";
  proxy.bridge.status = "waiting";

  ws.on("message", (data: string) => {
    const ctrlData: BridgeCtrlData = JSON.parse(data);
    switch (ctrlData.type) {
      case "connected":
        proxy.bridge.status = "connected";
        logger.info("target tunnel connected!");
        break;
    }
  });

  ws.on("close", () => {
    proxy.bridge.ctrl = null;
    proxy.bridge.status = "waiting";
    logger.info("bridge ctrl tunnel disconnected!");
  });

  logger.info("bridge ctrl tunnel connected!");
};

const dataHandler: WebsocketRequestHandler = (ws) => {
  if (proxy.bridge.data) {
    proxy.bridge.data.close();
  }

  proxy.bridge.data = ws;

  ws.on("close", () => {
    proxy.bridge.data = null;
    proxy.bridge.status = "waiting";
    logger.info("bridge data tunnel disconnected!");
  });

  logger.info("bridge data tunnel connected!");
};

export const create = function (app?: expressWs.Application) {
  const isWebBridgeMode = !!app;
  if (isWebBridgeMode) {
    proxy.mode = "bridge";
    app.ws("/ctrl", ctrlHandler);
    app.ws("/data", dataHandler);
  } else {
    proxy.mode = "default";
  }
  logger.info(`client mode: ${proxy.mode}`);
  createProxyServer({ port: proxy.port, hostname: proxy.hostname });
  return app;
};
