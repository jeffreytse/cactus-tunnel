import url from "url";
import winston from "winston";

// sleep function
export const sleep = (t: number) => new Promise((s) => setTimeout(s, t));

export type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

export type LoggerOptions = {
  label?: string;
  level?: LogLevel;
  silent?: boolean;
};

// logger
export const createLogger = (opt: LoggerOptions = {}) => {
  const customFormat = winston.format.combine(
    winston.format.label({ label: opt.label }),
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.sss",
    }),
    winston.format((info) => {
      info.level = info.level.toUpperCase();
      return info;
    })(),
    winston.format.colorize({
      all: true,
    }),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.label} ${info.level} ${info.message}`;
    })
  );

  const logger = winston.createLogger({
    level: opt.level,
    format: customFormat,
    transports: [new winston.transports.Console()],
  });

  logger.silent = !!opt.silent;

  return logger;
};

export const assignDeep = (target: object, source: object) => {
  for (const [key, value] of Object.entries(source)) {
    if (typeof target[key] === "object" && typeof value === "object") {
      assignDeep(target[key], value);
    } else {
      target[key] = value;
    }
  }
};

export const formConnStr = (proxyServer: string, proxyTarget: string) => {
  proxyServer += proxyServer.slice(-1) === "/" ? "" : "/";
  const encodedTarget = encodeURIComponent(proxyTarget);
  return `${proxyServer}tunnel?target=${encodedTarget}`;
};

export const parseConnStr = (value: string) => {
  const result = url.parse(value || "", true);
  const target = (result?.query?.target as string) || "";
  const [hostname, port] = target.split(":");

  if (isNaN(parseInt(port)) || hostname.length === 0) {
    return;
  }

  return { hostname, port: +port };
};

