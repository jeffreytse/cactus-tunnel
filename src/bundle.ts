// import all modules for bundle

import url from "url";
import { humanizeBytes } from "./utils";
import { createBridge, CustomWindow } from "./bridge";

// auto update page info
const autoUpdatePageInfo = () => {
  const bridgeMeta = (window as CustomWindow).bridgeMeta;

  // update tunnel status
  const statusEl = document.querySelector(".tunnel-status .value");
  let lastStatus = "";
  setInterval(() => {
    if (statusEl && lastStatus !== bridgeMeta.status) {
      lastStatus = bridgeMeta.status;
      statusEl.innerHTML = lastStatus;
    }
  }, 500);

  // update tunnel statics
  const sendEl = document.querySelector(".tunnel-send .value");
  const recvEl = document.querySelector(".tunnel-recv .value");
  let lastSend = 0;
  let lastRecv = 0;
  let lastSendSpeed = 0;
  let lastRecvSpeed = 0;
  setInterval(() => {
    if (sendEl) {
      let speed = bridgeMeta.statics.send - lastSend;
      speed = speed > 0 ? speed : 0;
      if (lastSend !== bridgeMeta.statics.send || lastSendSpeed !== speed) {
        lastSend = bridgeMeta.statics.send;
        lastSendSpeed = speed;
        sendEl.innerHTML = `${humanizeBytes(lastSend)} (${humanizeBytes(
          speed
        )}/s)`;
      }
    }
    if (recvEl) {
      let speed = bridgeMeta.statics.recv - lastRecv;
      speed = speed > 0 ? speed : 0;
      if (lastRecv !== bridgeMeta.statics.recv || lastRecvSpeed !== speed) {
        lastRecv = bridgeMeta.statics.recv;
        lastRecvSpeed = speed;
        recvEl.innerHTML = `${humanizeBytes(lastRecv)} (${humanizeBytes(
          speed
        )}/s)`;
      }
    }
  }, 1000);
};

// initialize bridge
const initBridge = () => {
  const result = url.parse(window.location.href, true);
  const localPort = result.port;
  const localUrl: string =
    (result?.query?.localUrl as string) || `localhost:${localPort}`;

  createBridge(`ws://${localUrl}`);
};

initBridge();
autoUpdatePageInfo();
