const config = {
  client: {
    port: parseInt(process.env.CT_CLIENT_PORT || "7700"),
    hostname: process.env.CT_CLIENT_HOSTNAME || "127.0.0.1",
  },
  server: {
    port: parseInt(process.env.CT_SERVER_PORT || "7800"),
    hostname: process.env.CT_SERVER_HOSTNAME || "0.0.0.0",
  },
  bridge: {
    port: parseInt(process.env.CT_BRIDGE_PORT || "7900"),
    hostname: process.env.CT_BRIDGE_HOSTNAME || "0.0.0.0",
  },
};

export default config;
