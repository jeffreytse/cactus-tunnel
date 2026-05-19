export const sleep = (t: number) => new Promise((s) => setTimeout(s, t));

export const assignDeep = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
  target = JSON.parse(JSON.stringify(target)) as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    if (typeof target[key] === "object" && target[key] !== null && typeof value === "object" && value !== null) {
      target[key] = assignDeep(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
};

export const fixAddress = (address: string) => {
  // windows doesn't support to connect to address 0.0.0.0:<port>
  return address.replace("0.0.0.0", "127.0.0.1");
}

export const formConnStr = (server: string, target: string) => {
  server = fixAddress(server);
  target = fixAddress(target);
  server += server.slice(-1) === "/" ? "" : "/";
  const encodedTarget = encodeURIComponent(target);
  return `${server}tunnel?target=${encodedTarget}`;
};

export const parseConnStr = (value: string) => {
  const result = new URL(value || "", "http://localhost");
  const target = result.searchParams.get("target") || "";
  const [hostname, port] = target.split(":");

  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum <= 0 || portNum > 65535 || hostname.length === 0) {
    return;
  }

  return { hostname, port: portNum };
};

export const humanizeBytes = (bytes: number, decimals?: number) => {
  if (bytes == 0) return "0 Bytes";
  const k = 1024,
    dm = decimals || 2,
    sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};
