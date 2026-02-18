import GenerateJWT from "#utils/generateJWT.js";
import VerifyToken from "#utils/verifyToken.js";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

describe("Generating valid JWT tokens for users", () => {
    it("Should return a truthy value after verification", () => {
        const token = GenerateJWT(new ObjectId().toString(), ["Admin", "Security"]);
        expect(VerifyToken(token)).toBeTruthy();
    });
});