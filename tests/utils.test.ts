import { describe, expect, test } from "@jest/globals";
import {
  assignDeep,
  fixAddress,
  formConnStr,
  humanizeBytes,
  parseConnStr,
} from "../src/utils";

describe("testing utils functionality", () => {
  const server = "ws://127.0.0.1:7800";
  const target = "127.0.0.1:22";
  const encodedTarget = encodeURIComponent(target);
  const connStr = `${server}/tunnel?target=${encodedTarget}`;

  describe("object deep assign", () => {
    test("should be deep merged", () => {
      const objA = {
        a: 1,
        b: {
          a: "a",
        },
      };
      const objB = {
        b: {
          a: "new a",
          b: "b",
        },
        c: "c",
      };
      expect(assignDeep(objA, objB)).toMatchObject({
        a: 1,
        b: {
          a: "new a",
          b: "b",
        },
        c: "c",
      });
    });
  });

  describe("humanize bytes", () => {
    test(`should return 0 Bytes`, () => {
      expect(humanizeBytes(0)).toEqual("0 Bytes");
    });

    test(`should return 1 KB`, () => {
      expect(humanizeBytes(1024)).toEqual("1 KB");
    });

    test(`should return 1 MB`, () => {
      expect(humanizeBytes(1024 * 1024)).toEqual("1 MB");
    });

    test(`should return 1 GB`, () => {
      expect(humanizeBytes(1024 * 1024 * 1024)).toEqual("1 GB");
    });
  });

  describe("fix binding address", () => {
    test(`should return `, () => {
      expect(fixAddress("0.0.0.0:80")).toBe("127.0.0.1:80");
    });
  });

  describe("form connection string", () => {
    test(`should return ${connStr}`, () => {
      expect(formConnStr(server, target)).toEqual(connStr);
    });

    test(`should return ${connStr}`, () => {
      expect(formConnStr(`${server}/`, target)).toEqual(connStr);
    });

    test(`should return ${connStr}`, () => {
      expect(formConnStr("ws://0.0.0.0:7800", "0.0.0.0:22")).toEqual(connStr);
    });
  });

  describe("parse connection string", () => {
    test(`should return undefined`, () => {
      expect(parseConnStr("")).toBeUndefined();
    });

    test(`should return undefined`, () => {
      expect(parseConnStr(`${server}/tunnel?target=`)).toBeUndefined();
    });

    test(`should return undefined`, () => {
      expect(
        parseConnStr(`${server}/tunnel?target=ssh-server`)
      ).toBeUndefined();
    });

    test(`should return undefined`, () => {
      expect(
        parseConnStr(`${server}/tunnel?target=ssh-server:a`)
      ).toBeUndefined();
    });

    test(`should return hostname and port`, () => {
      const [hostname, port] = target.split(":");
      expect(parseConnStr(connStr)).toMatchObject({
        hostname,
        port: parseInt(port),
      });
    });
  });
});
