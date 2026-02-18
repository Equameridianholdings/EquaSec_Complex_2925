import checkID from "#utils/checkID.js";
import { describe, expect, it } from "vitest";

describe("ID verification function", () => {
    it("Should return true for valid ID numbers", () => {
        expect(checkID("8001015009087")).toBeTruthy();
    })
});