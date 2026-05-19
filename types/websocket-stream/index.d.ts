declare module "websocket-stream" {
  // Type definitions for websocket-stream 5.3
  // Project: https://github.com/maxogden/websocket-stream#readme
  // Original definitions by: Ben Burns <https://github.com/benjamincburns>

  import * as ws from "ws";
  import { Duplex, DuplexOptions } from "stream";
  import * as http from "http";

  declare namespace WebSocketStream {
    type WebSocket = ws.WebSocket;
    type WebSocketDuplex = Duplex & { socket: WebSocket };

    interface Options extends ws.ClientOptions, DuplexOptions {
      binary?: boolean;
    }

    class Server extends ws.Server {
      on(
        event: "connection",
        cb: (
          this: ws.WebSocket,
          socket: ws.WebSocket,
          request: http.IncomingMessage
        ) => void
      ): this;
      on(event: "error", cb: (this: ws.WebSocket, error: Error) => void): this;
      on(
        event: "headers",
        cb: (
          this: ws.WebSocket,
          headers: string[],
          request: http.IncomingMessage
        ) => void
      ): this;
      on(event: "listening", cb: (this: ws.WebSocket) => void): this;
      on(
        event: "stream",
        cb: (
          this: ws.WebSocket,
          stream: WebSocketDuplex,
          request: http.IncomingMessage
        ) => void
      ): this;
      on(
        event: string | symbol,
        listener: (this: ws.WebSocket, ...args: object[]) => void
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

    interface ServerOptions extends ws.ServerOptions {
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
    target: string | ws.WebSocket,
    options?: WebSocketStream.Options
  ): WebSocketStream.WebSocketDuplex;

  declare function WebSocketStream(
    target: string | ws.WebSocket,
    protocols?: string | string[],
    options?: WebSocketStream.Options
  ): WebSocketStream.WebSocketDuplex;

  export = WebSocketStream;
}
