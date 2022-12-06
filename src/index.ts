import * as Server from "./server";
import * as Client from "./client";

export default {
  createServer: Server.create,
  createClient: Client.create,
};
