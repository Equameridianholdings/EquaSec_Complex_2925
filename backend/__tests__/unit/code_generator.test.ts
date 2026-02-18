import Code_Generator from "#utils/code_generator.js";
import { describe, expect, it } from "vitest";

describe("code generate function", () => {
    it("should return a 6-digit code", () => {
        expect(Code_Generator()).toBeGreaterThan(99999);
        expect(Code_Generator()).toBeLessThan(1000000);
    });
});