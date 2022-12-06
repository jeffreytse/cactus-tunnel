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

type Bridge = {
  client: {
    ctrl: WebSocketStream.WebSocket | null;
    data: WebSocketStream.WebSocket | null;
  };
  status: "disconnected" | "waiting" | "connected";
};

const bridge: Bridge = {
  client: {
    ctrl: null,
    data: null,
  },
  status: "disconnected",
};

const connectToRemote = (connStr: string) => {
  logger.info(`connecting to ${connStr}...`);

  const client = WebSocketStream(bridge.client.data, {
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
    .on("error", (err: string) => {
      logger.error(`server error: ${err}!`);
    })
    .on("close", (err: string) => {
      if (err) {
        logger.error(`server error: ${err}!`);
      }
      bridge.status = "disconnected";
      logger.info(`server closed!`);
    });

  const onStreamError: pump.Callback = (/* err */) => {
    bridge.status = "disconnected";

    if (bridge.client.ctrl) {
      bridge.client.ctrl.close();
    }
    if (bridge.client.data) {
      bridge.client.data.close();
    }

    logger.error("Tunnel stream error!");
  };

  pump(client, server, onStreamError);
  pump(server, client, onStreamError);

  const ctrlData: BridgeCtrlData = { type: "connected" };
  bridge.client.ctrl?.send(JSON.stringify(ctrlData));

  logger.info(`tunnel connected! ${connStr}`);
};

const openCtrlTunnel = (clientUrl: string) => {
  const ws = WebSocketStream(clientUrl + "/ctrl");
  bridge.client.ctrl = ws.socket;
  ws.on("connect", () => {
    logger.info("client ctrl tunnel connected!");
    openDataTunnel(clientUrl);
  })
    .on("error", () => {
      logger.error(`client ctrl tunnel error!`);
      bridge.client.ctrl?.close();
    })
    .on("close", () => {
      bridge.status = "disconnected";
      logger.info(`client ctrl tunnel closed!`);
    })
    .on("data", (data: string) => {
      const ctrlData: BridgeCtrlData = JSON.parse(data.toString());
      logger.info(`client ctrl data: ${ctrlData}!`);
      switch (ctrlData.type) {
        case "connect":
          connectToRemote(ctrlData.data.connStr);
          break;
      }
    });
};

const openDataTunnel = (clientUrl: string) => {
  const ws = WebSocketStream(clientUrl + "/data");
  bridge.client.data = ws.socket;
  ws.on("connect", () => {
    bridge.status = "waiting";
    logger.info("client data tunnel connected!");
  })
    .on("error", (err: string) => {
      logger.error(`client data tunnel error! ${err}`);
      bridge.client.data?.close();
    })
    .on("close", (err: string) => {
      bridge.status = "disconnected";
      if (err) {
        logger.error(`client data tunnel error: ${err}!`);
      }
      logger.info(`client data tunnel closed!`);
    });
};

const connectToClient = (clientUrl: string) => {
  logger.info(`connect to client...`);
  bridge.status = "waiting";
  openCtrlTunnel(clientUrl);
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

export const createBridge = (clientUrl: string): void => {
  const hasWebSocket = "WebSocket" in window;

  if (!hasWebSocket) {
    alert("Browser doesn't support WebSocket!");
    return;
  }

  checkConnection(() => connectToClient(clientUrl));
};
