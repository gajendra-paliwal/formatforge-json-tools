import { describe, expect, it } from "vitest";
import {
  escapePointer,
  getPointer,
  hasPointer,
  JsonPointerError,
  listPointers,
  parsePointer,
  removePointer,
  setPointer,
  unescapePointer
} from "../src";

const document = {
  user: {
    name: "Ada",
    active: true,
    address: { city: "London" }
  },
  orders: [
    { id: 1, total: 10 },
    { id: 2, total: 20 }
  ],
  "a/b": { "m~n": "escaped" },
  empty: null
};

describe("JSON Pointer", () => {
  it("reads the root value using an empty pointer", () => {
    expect(getPointer(document, "")).toBe(document);
  });

  it("reads nested object properties", () => {
    expect(getPointer(document, "/user/address/city")).toBe("London");
  });

  it("reads array items", () => {
    expect(getPointer(document, "/orders/1/total")).toBe(20);
  });

  it("reads empty property names", () => {
    expect(getPointer({ "": "value" }, "/")).toBe("value");
  });

  it("supports RFC 6901 escaped tokens", () => {
    expect(getPointer(document, "/a~1b/m~0n")).toBe("escaped");
  });

  it("reports missing properties", () => {
    expect(() => getPointer(document, "/user/missing")).toThrow(JsonPointerError);
  });

  it("rejects traversal through primitives", () => {
    expect(() => getPointer(document, "/user/name/length")).toThrow("primitive");
  });

  it("rejects invalid array indexes", () => {
    expect(() => getPointer(document, "/orders/01")).toThrow("invalid array index");
    expect(() => getPointer(document, "/orders/-1")).toThrow("invalid array index");
    expect(() => getPointer(document, "/orders/-")).toThrow('"-"');
  });

  it("rejects pointers that do not begin with a slash", () => {
    expect(() => parsePointer("user/name")).toThrow('start with "/"');
  });

  it("rejects malformed escape sequences", () => {
    expect(() => parsePointer("/a~2b")).toThrow("invalid escape sequence");
    expect(() => parsePointer("/a~")).toThrow("invalid escape sequence");
  });

  it("escapes and unescapes tokens", () => {
    expect(escapePointer("a/b~c")).toBe("a~1b~0c");
    expect(unescapePointer("a~1b~0c")).toBe("a/b~c");
  });

  it("parses a pointer into decoded tokens", () => {
    expect(parsePointer("/a~1b/m~0n")).toEqual(["a/b", "m~n"]);
  });

  it("checks pointer existence", () => {
    expect(hasPointer(document, "/empty")).toBe(true);
    expect(hasPointer(document, "/missing")).toBe(false);
  });

  it("immutably replaces an object property", () => {
    const result = setPointer(document, "/user/name", "Grace");
    expect(getPointer(result, "/user/name")).toBe("Grace");
    expect(document.user.name).toBe("Ada");
  });

  it("immutably adds an object property", () => {
    const result = setPointer(document, "/user/role", "admin");
    expect(getPointer(result, "/user/role")).toBe("admin");
    expect(hasPointer(document, "/user/role")).toBe(false);
  });

  it("immutably replaces an array item", () => {
    const result = setPointer(document, "/orders/0", { id: 3, total: 30 });
    expect(getPointer(result, "/orders/0/id")).toBe(3);
    expect(document.orders[0].id).toBe(1);
  });

  it("appends to an array using the dash token", () => {
    const result = setPointer(document, "/orders/-", { id: 3, total: 30 });
    expect(getPointer(result, "/orders/2/id")).toBe(3);
    expect(document.orders).toHaveLength(2);
  });

  it("appends to an array using its length", () => {
    const result = setPointer(document, "/orders/2", { id: 3, total: 30 });
    expect(getPointer(result, "/orders/2/id")).toBe(3);
  });

  it("rejects array indexes beyond the append position", () => {
    expect(() => setPointer(document, "/orders/4", null)).toThrow("out of bounds");
  });

  it("replaces the root value immutably", () => {
    const replacement = { status: "ok" };
    const result = setPointer(document, "", replacement);
    expect(result).toEqual(replacement);
    expect(result).not.toBe(replacement);
  });

  it("clones assigned values", () => {
    const value = { role: "admin" };
    const result = setPointer(document, "/user/meta", value);
    value.role = "changed";
    expect(getPointer(result, "/user/meta/role")).toBe("admin");
  });

  it("immutably removes object properties", () => {
    const result = removePointer(document, "/user/active");
    expect(hasPointer(result, "/user/active")).toBe(false);
    expect(document.user.active).toBe(true);
  });

  it("immutably removes array items and closes the gap", () => {
    const result = removePointer(document, "/orders/0");
    expect(getPointer(result, "/orders/0/id")).toBe(2);
    expect(document.orders).toHaveLength(2);
  });

  it("rejects removing missing values and the root", () => {
    expect(() => removePointer(document, "/missing")).toThrow("does not exist");
    expect(() => removePointer(document, "")).toThrow("root");
  });

  it("lists leaf pointers with correct escaping", () => {
    expect(listPointers(document)).toEqual([
      "/user/name",
      "/user/active",
      "/user/address/city",
      "/orders/0/id",
      "/orders/0/total",
      "/orders/1/id",
      "/orders/1/total",
      "/a~1b/m~0n",
      "/empty"
    ]);
  });

  it("can include container and root pointers", () => {
    const pointers = listPointers({ items: [1] }, { includeContainers: true, includeRoot: true });
    expect(pointers).toEqual(["", "/items", "/items/0"]);
  });

  it("does not traverse inherited prototype properties", () => {
    expect(() => setPointer({}, "/__proto__/polluted", true)).toThrow("does not exist");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("includes pointer context in errors", () => {
    try {
      getPointer(document, "/orders/9");
      throw new Error("expected getPointer to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(JsonPointerError);
      expect(error).toMatchObject({ pointer: "/orders/9", token: "9", tokenIndex: 1 });
    }
  });
});
