const config = {
  client: {
    port: parseInt(process.env.PROXY_PORT || "7700"),
    hostname: process.env.PROXY_HOSTNAME || "0.0.0.0",
    server: process.env.PROXY_SERVER || "auto",
    target: process.env.PROXY_TARGET || "auto",
  },
  server: {
    port: parseInt(process.env.PROXY_PORT || "7800"),
    hostname: process.env.PROXY_HOSTNAME || "0.0.0.0",
  },
  bridge: {
    port: parseInt(process.env.PROXY_BRIDGE_PORT || "7900"),
    hostname: process.env.PROXY_BRIDGE_HOSTNAME || "127.0.0.1",
  },
};

export default config;
