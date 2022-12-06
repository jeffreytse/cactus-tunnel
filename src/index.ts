import * as Server from "./server";
import * as Client from "./client";

export const createServer = Server.create;
export const createClient = Client.create;

export default {
  createServer,
  createClient,
};
