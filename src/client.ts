import { RequestHandler } from "express";
import { WebsocketRequestHandler } from "express-ws";
import WebSocketStream from "websocket-stream";
import { createServer, Server, Socket } from "net";
import pump from "pump";
import { createWebServer, HostAddressInfo } from "./core";
import { BridgeCtrlData } from "./bridge";
import { sleep, createLogger } from "./utils";

export const logger = createLogger({ label: "cactus-tunnel:client" });

type ClientOptions = {
  listen: HostAddressInfo;
  server: string;
  target: string;
  bridge?: HostAddressInfo;
};

type ClientMeta = {
  tcpServer: Server | null;
  clients: Socket[];
  bridge: {
    ctrl: WebSocketStream.WebSocket | null;
    data: WebSocketStream.WebSocket | null;
    origin: string;
    status: "waiting" | "connected";
  };
  mode: "direct" | "bridge";
};

const clientOptions: ClientOptions = {
  listen: {
    port: -1,
  },
  bridge: {
    port: -1,
  },
  server: "",
  target: "",
};

const clientMeta: ClientMeta = {
  tcpServer: null,
  clients: [],
  bridge: {
    ctrl: null,
    data: null,
    origin: "",
    status: "waiting",
  },
  mode: "direct",
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
    clientMeta.clients.splice(clientMeta.clients.indexOf(local), 1);
  });

  clientMeta.clients.push(local);

  let remote: WebSocketStream.WebSocketDuplex | null = null;

  const connStr = formConnStr(clientOptions.server, clientOptions.target);
  logger.info(`connecting to remote target: ${connStr}`);

  // handle connection according to proxy mode
  if (clientMeta.mode === "bridge") {
    // check if bridge ctrl and data tunnel are connected
    if (!clientMeta.bridge.ctrl || !clientMeta.bridge.data) {
      logger.info("waiting for the bridge ctrl and data tunnel...");
      while (!clientMeta.bridge.ctrl || !clientMeta.bridge.data) {
        await sleep(50);
      }
    }

    remote = WebSocketStream(clientMeta.bridge.data, {
      // websocket-stream options here
      binary: true,
    });

    const ctrlData: BridgeCtrlData = {
      type: "connect",
      data: { connStr },
    };

    logger.info("waiting for the bridge to establish tunnel...");

    clientMeta.bridge.ctrl.send(JSON.stringify(ctrlData));

    while (clientMeta.bridge.status === "waiting") {
      await sleep(50);
    }
  } else {
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

    logger.info("remote target connected!");

    pump(remote, local, onError);
    pump(local, remote, onError);
  };

  // pipe stream after remote websocket stream connected
  setTimeout(pipe, 100);
};

const createProxyServer = (opt: { port: number; hostname?: string }) => {
  // destroy old proxy server
  if (clientMeta.tcpServer) {
    clientMeta.clients.forEach((client) => client.destroy());
    clientMeta.clients = [];
    clientMeta.tcpServer.close(() => {
      logger.info("closed old proxy server");
      clientMeta.tcpServer?.unref();
      clientMeta.tcpServer = null;
      createProxyServer(opt);
    });
    return;
  }

  // Create TCP proxy server
  const server = createServer();
  clientMeta.tcpServer = server;
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
  if (clientMeta.bridge.ctrl) {
    clientMeta.bridge.ctrl.close();
  }

  clientMeta.bridge.ctrl = ws;
  clientMeta.bridge.origin = req.headers.origin || "";
  clientMeta.bridge.status = "waiting";

  ws.on("message", (data: string) => {
    const ctrlData: BridgeCtrlData = JSON.parse(data);
    switch (ctrlData.type) {
      case "connected":
        clientMeta.bridge.status = "connected";
        logger.info("target tunnel connected!");
        break;
    }
  });

  ws.on("close", () => {
    clientMeta.bridge.ctrl = null;
    clientMeta.bridge.status = "waiting";
    logger.info("bridge ctrl tunnel disconnected!");
  });

  logger.info("bridge ctrl tunnel connected!");
};

const dataHandler: WebsocketRequestHandler = (ws) => {
  if (clientMeta.bridge.data) {
    clientMeta.bridge.data.close();
  }

  clientMeta.bridge.data = ws;

  ws.on("close", () => {
    clientMeta.bridge.data = null;
    clientMeta.bridge.status = "waiting";
    logger.info("bridge data tunnel disconnected!");
  });

  logger.info("bridge data tunnel connected!");
};

const pageHandler: RequestHandler = (_, res) => {
  res.render("index");
};

export const create = (opt: ClientOptions) => {
  for (const [key, value] of Object.entries(opt)) {
    clientOptions[key] = value;
  }
  // check if enable the bridge
  if (opt.bridge) {
    clientMeta.mode = "bridge";
    const app = createWebServer({
      ...opt.bridge,
      callback: (server) => {
        const addressInfo = server?.address();
        if (typeof addressInfo === "string") {
          return;
        }
        logger.info(
          `Tunnel Bridge running on http://${addressInfo?.address}:${addressInfo?.port}`
        );
      },
    });
    app.ws("/ctrl", ctrlHandler);
    app.ws("/data", dataHandler);
    app.get("/", pageHandler);
  }
  logger.info(`tunnel mode: ${clientMeta.mode}`);
  createProxyServer(opt.listen);
};
