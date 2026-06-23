import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { schema2typebox } from "../src/index";
import { buildOsIndependentPath } from "./util";

const readFixture = (relPath: string): string =>
  readFileSync(
    buildOsIndependentPath([process.cwd(), ...relPath.split("/")]),
    "utf-8"
  );

describe("recursive schema support (issue #62)", () => {
  const input = readFixture("test/fixture/recursiveCondition.json");

  it("does not crash on a recursive schema", async () => {
    await expect(schema2typebox({ input })).resolves.toBeDefined();
  });

  it("wraps the recursive node in Type.Recursive with a 'This' placeholder", async () => {
    const result = await schema2typebox({ input });
    expect(result).toContain("Type.Recursive(");
    expect(result).toContain("This");
  });

  it("uses native Type.Union for the oneOf that contains the back-edge", async () => {
    // The inner oneOf (conditions.items) contains the recursive back-edge, so
    // it MUST be emitted as Type.Union (the custom OneOf helper cannot validate
    // a bare 'This' ref). The outer oneOf has no free back-edge.
    const result = await schema2typebox({ input });
    expect(result).toContain("Type.Union(");
  });

  it("leaves non-recursive output unchanged (custom OneOf still used at the root)", async () => {
    // The top-level oneOf does not directly contain a free back-edge, so the
    // existing ExtendedOneOf support code is still emitted.
    const result = await schema2typebox({ input });
    expect(result).toContain("ExtendedOneOf");
  });
});
