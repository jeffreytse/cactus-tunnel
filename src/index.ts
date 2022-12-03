import * as ProxyCore from "./core";
import * as ProxyServer from "./server";
import * as ProxyClient from "./client";

export default {
  createWebServer: ProxyCore.createWebServer,
  createServer: ProxyServer.create,
  createClient: ProxyClient.create,
};
