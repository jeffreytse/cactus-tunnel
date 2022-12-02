declare module "http" {
  interface TunnelInfo {
    hostname: string;
    port: number;
  }

  interface IncomingMessage {
    tunnelInfo: TunnelInfo;
  }
}
