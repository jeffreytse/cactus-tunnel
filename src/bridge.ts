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
  local: {
    ctrl: WebSocketStream.WebSocket | null;
    data: WebSocketStream.WebSocket | null;
  };
  status: "disconnected" | "waiting" | "connected";
};

const bridge: Bridge = {
  local: {
    ctrl: null,
    data: null,
  },
  status: "disconnected",
};

const connectToRemote = (connStr: string) => {
  logger.info(`connecting to ${connStr}...`);

  const local = WebSocketStream(bridge.local.data, {
    binary: true,
  });
  const remote = WebSocketStream(connStr, {
    binary: true,
  });

  remote
    .on("connect", () => {
      bridge.status = "connected";
      logger.info(`remote connected!`);
    })
    .on("error", (err: string) => {
      logger.error(`remote error: ${err}!`);
    })
    .on("close", (err: string) => {
      if (err) {
        logger.error(`remote error: ${err}!`);
      }
      bridge.status = "disconnected";
      logger.info(`remote is closing!`);
    });

  const onStreamError: pump.Callback = (/* err */) => {
    bridge.status = "disconnected";

    if (bridge.local.ctrl) {
      bridge.local.ctrl.close();
    }
    if (bridge.local.data) {
      bridge.local.data.close();
    }

    logger.error("Tunnel stream error!");
  };

  pump(local, remote, onStreamError);
  pump(remote, local, onStreamError);

  const ctrlData: BridgeCtrlData = { type: "connected" };
  bridge.local.ctrl?.send(JSON.stringify(ctrlData));

  logger.info(`tunnel connected! ${connStr}`);
};

const openCtrlTunnel = (localUrl: string) => {
  const ws = WebSocketStream(localUrl + "/ctrl");
  bridge.local.ctrl = ws.socket;
  ws.on("connect", () => {
    logger.info("local ctrl connected!");
    openDataTunnel(localUrl);
  })
    .on("error", () => {
      logger.error(`local ctrl error!`);
      bridge.local.ctrl?.close();
    })
    .on("close", () => {
      bridge.status = "disconnected";
      logger.info(`local ctrl is closing!`);
    })
    .on("data", (data: string) => {
      const ctrlData: BridgeCtrlData = JSON.parse(data.toString());
      logger.info(`local ctrl data: ${ctrlData}!`);
      switch (ctrlData.type) {
        case "connect":
          connectToRemote(ctrlData.data.connStr);
          break;
      }
    });
};

const openDataTunnel = (localUrl: string) => {
  const ws = WebSocketStream(localUrl + "/data");
  bridge.local.data = ws.socket;
  ws.on("connect", () => {
    bridge.status = "waiting";
    logger.info("local data connected!");
  })
    .on("error", (err: string) => {
      logger.error(`local data error! ${err}`);
      bridge.local.data?.close();
    })
    .on("close", (err: string) => {
      bridge.status = "disconnected";
      if (err) {
        logger.error(`local data error: ${err}!`);
      }
      logger.info(`local data is closing!`);
    });
};

const connectToLocal = (localUrl: string) => {
  logger.info(`connect to local...`);
  bridge.status = "waiting";
  openCtrlTunnel(localUrl);
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

export const createBridge = (localUrl: string): void => {
  const hasWebSocket = "WebSocket" in window;

  if (!hasWebSocket) {
    alert("Browser doesn't support WebSocket!");
    return;
  }

  checkConnection(() => connectToLocal(localUrl));
};
