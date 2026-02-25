import { testUser } from "#__tests__/testUser.js";
import GenerateJWT from "#utils/generateJWT.js";
import VerifyToken from "#utils/verifyToken.js";
import { describe, expect, it } from "vitest";

describe("Generating valid JWT tokens for users", () => {
    it("Should return a truthy value after verification", () => {
        const token = GenerateJWT(testUser.emailAddress, ["Admin", "Security"]);
        expect(VerifyToken(token)).toBeTruthy();
    });
});