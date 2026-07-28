import { describe, expect, it } from "vitest";
import {
  deepClone,
  deepMerge,
  flattenJson,
  removeEmpty,
  sortJsonKeys,
  unflattenJson
} from "../src";

describe("flattenJson and unflattenJson", () => {
  it("round-trips nested objects and arrays", () => {
    const input = {
      customer: {
        name: "Asha",
        orders: [
          { id: 1, items: ["tea", "rice"] },
          { id: 2, items: [] }
        ]
      }
    };

    const flattened = flattenJson(input);

    expect(flattened).toEqual({
      "customer.name": "Asha",
      "customer.orders[0].id": 1,
      "customer.orders[0].items[0]": "tea",
      "customer.orders[0].items[1]": "rice",
      "customer.orders[1].id": 2,
      "customer.orders[1].items": []
    });
    expect(unflattenJson(flattened)).toEqual(input);
  });

  it("escapes delimiter, brackets, and backslashes in object keys", () => {
    const input = {
      "profile.name": {
        "labels[0]": "primary",
        "folder\\name": true
      }
    };

    expect(unflattenJson(flattenJson(input))).toEqual(input);
  });

  it("supports a custom delimiter", () => {
    const input = { account: { owner: "Mina" } };
    const flattened = flattenJson(input, { delimiter: "/" });

    expect(flattened).toEqual({ "account/owner": "Mina" });
    expect(unflattenJson(flattened, { delimiter: "/" })).toEqual(input);
  });

  it("round-trips primitive and empty root values", () => {
    expect(unflattenJson(flattenJson(null))).toBeNull();
    expect(unflattenJson(flattenJson([]))).toEqual([]);
    expect(unflattenJson(flattenJson({}))).toEqual({});
  });

  it("rejects conflicting paths", () => {
    expect(() =>
      unflattenJson({ account: "value", "account.name": "Mina" })
    ).toThrow(TypeError);
  });

  it("blocks prototype-pollution keys", () => {
    expect(() => unflattenJson({ "__proto__.polluted": true })).toThrow(
      /unsafe object key/
    );
  });

  it("rejects invalid delimiters", () => {
    expect(() => flattenJson({}, { delimiter: "::" })).toThrow(RangeError);
  });
});

describe("deepClone", () => {
  it("creates an independent recursive clone", () => {
    const input = { profile: { tags: ["json"] } };
    const clone = deepClone(input);

    clone.profile.tags.push("tools");

    expect(input.profile.tags).toEqual(["json"]);
    expect(clone.profile.tags).toEqual(["json", "tools"]);
  });

  it("rejects non-JSON values", () => {
    expect(() => deepClone({ createdAt: new Date() } as never)).toThrow(TypeError);
    expect(() => deepClone({ value: Number.NaN } as never)).toThrow(TypeError);
  });
});

describe("deepMerge", () => {
  it("merges nested objects without mutating inputs", () => {
    const target = { profile: { name: "Asha", active: true }, page: 1 };
    const source = { profile: { active: false, city: "Pune" } };

    const result = deepMerge(target, source);

    expect(result).toEqual({
      profile: { name: "Asha", active: false, city: "Pune" },
      page: 1
    });
    expect(target.profile.active).toBe(true);
  });

  it("replaces arrays by default", () => {
    expect(deepMerge({ tags: ["a"] }, { tags: ["b"] })).toEqual({ tags: ["b"] });
  });

  it("can concatenate arrays", () => {
    expect(
      deepMerge({ tags: ["a"] }, { tags: ["b"] }, { arrayStrategy: "concat" })
    ).toEqual({ tags: ["a", "b"] });
  });

  it("replaces values when their container types differ", () => {
    expect(deepMerge({ value: { nested: true } }, { value: [1, 2] })).toEqual({
      value: [1, 2]
    });
  });
});

describe("sortJsonKeys", () => {
  it("sorts nested object keys while preserving array order", () => {
    const result = sortJsonKeys({
      z: 1,
      a: [{ y: 2, b: 3 }, { c: 4, a: 5 }]
    });

    expect(JSON.stringify(result)).toBe(
      '{"a":[{"b":3,"y":2},{"a":5,"c":4}],"z":1}'
    );
  });

  it("supports a custom comparator", () => {
    const result = sortJsonKeys({ a: 1, c: 3, b: 2 }, {
      compare: (left, right) => right.localeCompare(left)
    });

    expect(Object.keys(result)).toEqual(["c", "b", "a"]);
  });
});

describe("removeEmpty", () => {
  it("removes empty nested values without mutating the input", () => {
    const input = {
      name: "FormatForge",
      empty: "",
      nullable: null,
      metadata: {},
      tags: ["json", "", null, [], {}],
      nested: { keep: false, remove: "" }
    };

    const result = removeEmpty(input);

    expect(result).toEqual({
      name: "FormatForge",
      tags: ["json"],
      nested: { keep: false }
    });
    expect(input.tags).toHaveLength(5);
  });

  it("supports preserving selected empty values", () => {
    expect(
      removeEmpty(
        { nullable: null, blank: "", list: [], object: {} },
        {
          removeNull: false,
          removeEmptyStrings: false,
          removeEmptyArrays: false,
          removeEmptyObjects: false
        }
      )
    ).toEqual({ nullable: null, blank: "", list: [], object: {} });
  });

  it("can trim strings before checking emptiness", () => {
    expect(removeEmpty({ blank: "   ", name: "  JSON  " }, { trimStrings: true })).toEqual({
      name: "JSON"
    });
  });

  it("preserves a root primitive or empty root container", () => {
    expect(removeEmpty("")).toBe("");
    expect(removeEmpty([])).toEqual([]);
    expect(removeEmpty({})).toEqual({});
  });
});
