declare module "websocket-stream" {
  // Type definitions for websocket-stream 5.3
  // Project: https://github.com/maxogden/websocket-stream#readme
  // Original definitions by: Ben Burns <https://github.com/benjamincburns>

  import * as ws from "ws";
  import { Duplex } from "stream";
  import * as http from "http";

  declare namespace WebSocketStream {
    type WebSocket = ws;
    type WebSocketDuplex = Duplex & { socket: WebSocket };

    class Server extends WebSocket.Server {
      on(
        event: "connection",
        cb: (
          this: WebSocket,
          socket: WebSocket,
          request: http.IncomingMessage
        ) => void
      ): this;
      on(event: "error", cb: (this: WebSocket, error: Error) => void): this;
      on(
        event: "headers",
        cb: (
          this: WebSocket,
          headers: string[],
          request: http.IncomingMessage
        ) => void
      ): this;
      on(event: "listening", cb: (this: WebSocket) => void): this;
      on(
        event: "stream",
        cb: (
          this: WebSocket,
          stream: WebSocketDuplex,
          request: http.IncomingMessage
        ) => void
      ): this;
      on(
        event: string | symbol,
        listener: (this: WebSocket, ...args: object[]) => void
      ): this;
    }

    function ConnectionListenerCallback(
      result: boolean | null,
      status: number,
      msg: string
    ): void;

    function ConnectionListener(
      options?: { req: http.IncomingMessage; res: http.ServerResponse },
      callback?: ConnectionListenerCallback
    ): void;

    interface ServerOptions extends WebSocket.ServerOptions {
      server: http.Server;
      clientVerify?: (
        req: http.IncomingMessage,
        callback: ConnectionListenerCallback
      ) => void;
    }

    function createServer(
      opts?: ServerOptions,
      callback?: ConnectionListener
    ): Server;
  }

  declare function WebSocketStream(
    target: string | WebsocketStream.WebSocket,
    options?: WebSocket.ClientOptions
  ): WebSocketStream.WebSocketDuplex;

  declare function WebSocketStream(
    target: string | WebsocketStream.WebSocket,
    protocols?: string | string[],
    options?: WebSocket.ClientOptions
  ): WebSocketStream.WebSocketDuplex;

  export = WebSocketStream;
}
