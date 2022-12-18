import WebSocketStream from "websocket-stream";
import pump from "pump";
import { createLogger } from "./utils";

const logger = createLogger({ label: "cactus-tunnel:bridge" });

export type BridgeCtrlData =
  | {
      type: "connect";
      data: {
        connStr: string;
      };
    }
  | {
      type: "connected";
      data?: object;
    };

type BridgeStatus = "disconnected" | "waiting" | "connected";
type DataStatics = { send: number; recv: number };

type Bridge = {
  client: {
    ctrl: WebSocketStream.WebSocketDuplex | null;
    data: WebSocketStream.WebSocketDuplex | null;
  };
  statics: DataStatics;
  status: BridgeStatus;
  connStr: string;
};

type BridgeData = {
  status: BridgeStatus;
  statics: DataStatics;
};

export type CustomWindow = typeof window & { bridgeMeta: BridgeData };

const bridge: Bridge = {
  client: {
    ctrl: null,
    data: null,
  },
  statics: {
    send: 0,
    recv: 0,
  },
  status: "disconnected",
  connStr: "",
};

const connectToRemote = (connStr: string) => {
  logger.info(`connecting to ${connStr}...`);

  if (bridge.connStr !== connStr) {
    bridge.connStr = connStr;
    bridge.statics.send = 0;
    bridge.statics.recv = 0;
  }

  const client = WebSocketStream(bridge.client.data?.socket, {
    binary: true,
  });
  const server = WebSocketStream(connStr, {
    binary: true,
  });

  server
    .on("connect", () => {
      bridge.status = "connected";
      logger.info(`server connected!`);
    })
    .on("error", () => {
      logger.error(`server error!`);
    })
    .on("close", (err: Error) => {
      if (err) {
        logger.error(`server error: ${err.message}!`);
      }
      bridge.client.data?.end(() => bridge.client.data?.destroy());
      logger.info(`server closed!`);
    });

  const onStreamError: pump.Callback = (/* err */) => {
    logger.error("tunnel stream error!");
  };

  pump(client, server, onStreamError).on("data", (data) => {
    bridge.statics.recv += data.byteLength;
  });
  pump(server, client, onStreamError).on("data", (data) => {
    bridge.statics.send += data.byteLength;
  });

  const ctrlData: BridgeCtrlData = { type: "connected" };
  bridge.client.ctrl?.socket.send(JSON.stringify(ctrlData));

  logger.info(`tunnel connected! ${connStr}`);
};

const openCtrlTunnel = (clientUrl: string) => {
  const ws = WebSocketStream(clientUrl + "/ctrl");
  bridge.client.ctrl = ws;
  ws.on("connect", () => {
    if (!!bridge.client.ctrl && !!bridge.client.data) {
      bridge.status = "waiting";
    }
    logger.info("client ctrl tunnel connected!");
  })
    .on("error", () => {
      logger.error(`client ctrl tunnel error!`);
    })
    .on("close", () => {
      bridge.client.ctrl = null;
      bridge.status = "disconnected";
      logger.info(`client ctrl tunnel closed!`);
    })
    .on("data", (data: string) => {
      const ctrlData: BridgeCtrlData = JSON.parse(data.toString());
      logger.info(`client ctrl data: ${data.toString()}!`);
      switch (ctrlData.type) {
        case "connect":
          connectToRemote(ctrlData.data.connStr);
          break;
      }
    });
};

const openDataTunnel = (clientUrl: string) => {
  const ws = WebSocketStream(clientUrl + "/data");
  bridge.client.data = ws;
  ws.on("connect", () => {
    if (!!bridge.client.ctrl && !!bridge.client.data) {
      bridge.status = "waiting";
    }
    logger.info("client data tunnel connected!");
  })
    .on("error", () => {
      logger.error(`client data tunnel error!`);
    })
    .on("close", (err: Error) => {
      bridge.client.data = null;
      bridge.status = "disconnected";
      if (err) {
        logger.error(`client data tunnel error: ${err.message}!`);
      }
      logger.info(`client data tunnel closed!`);
    });
};

const connectToClient = (clientUrl: string) => {
  logger.info(`connect to client...`);
  bridge.client.ctrl || openCtrlTunnel(clientUrl);
  bridge.client.data || openDataTunnel(clientUrl);
};

const checkConnection = (callback?: () => void) => {
  const func = () => {
    if (bridge.status === "disconnected") {
      callback && callback();
    }
  };
  setTimeout(() => checkConnection(callback), 100);
  func();
};

const updateBridgeMeta = () => {
  (window as CustomWindow).bridgeMeta = {
    status: bridge.status,
    statics: {
      send: bridge.statics.send,
      recv: bridge.statics.recv,
    },
  };
  setInterval(() => {
    const bridgeMeta = (window as CustomWindow).bridgeMeta;
    bridgeMeta.status = bridge.status;
    bridgeMeta.statics.send = bridge.statics.send;
    bridgeMeta.statics.recv = bridge.statics.recv;
  }, 500);
};

export const createBridge = (clientUrl: string): void => {
  const hasWebSocket = "WebSocket" in window;

  if (!hasWebSocket) {
    alert("Browser doesn't support WebSocket!");
    return;
  }

  checkConnection(() => connectToClient(clientUrl));
  updateBridgeMeta();
};
