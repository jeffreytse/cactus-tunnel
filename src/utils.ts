import winston from "winston";

// sleep function
export const sleep = (t: number) => new Promise((s) => setTimeout(s, t));

// logger
export const createLogger = (opt: { level?: string; label?: string } = {}) => {
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

  return winston.createLogger({
    level: opt.level,
    format: customFormat,
    transports: [new winston.transports.Console()],
  });
};
