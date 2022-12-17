import { describe, expect, test } from "@jest/globals";
import { assignDeep, formConnStr, parseConnStr } from "../src/utils";

describe("testing utils functionality", () => {
  const server = "ws://tunnel-server:7800";
  const target = "ssh-server:22";
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

  describe("form connection string", () => {
    test(`should return ${connStr}`, () => {
      expect(formConnStr(server, target)).toEqual(connStr);
    });

    test(`should return ${connStr}`, () => {
      expect(formConnStr(`${server}/`, target)).toEqual(connStr);
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
