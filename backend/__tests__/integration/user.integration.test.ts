import { testUser } from "#__tests__/testUser.js";
import { ResponseBody } from "#app.js";
import { Error } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";

describe("User endpoints flow", () => {
  let URI: string;

  beforeEach(() => {
    URI = process.env.TEST_SERVER_URI as unknown as string;
    if (!URI) throw new Error("No test server port");
  });

  it("Should register a new user and return a 201 response", async () => {
    const req = await fetch(`${URI}/user/register`, {
      body: JSON.stringify(testUser),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const res = (await req.json()) as ResponseBody;

    expect(req.status).toBe(201);
    expect(res.message).toBe("User successfully added!");
    expect(res.payload).toBeTruthy();
  });

  it("Should flag a registration for invalid details and return a 400 response code", async () => {
    const invalidUser = {};

    const req = await fetch(`${URI}/user/register`, {
      body: JSON.stringify(invalidUser),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(req.status).toBe(400);
  });

  it("Should login a user to the system and return a jwt bearer token and a 200 response", async () => {
    const loginUser = {
      emailAddress: testUser.emailAddress,
      password: testUser.password,
    };

    const req = await fetch(`${URI}/user/login`, {
      body: JSON.stringify(loginUser),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const res = (await req.json()) as ResponseBody;

    expect(req.status).toBe(200);
    expect(res.payload as string).toBeTruthy();
  });

  it("Should flag login and return a 401 response", async () => {
    const loginUser = {
      emailAddress: "InvalidUser@test.com",
      password: "654321",
    };

    const req = await fetch(`${URI}/user/login`, {
      body: JSON.stringify(loginUser),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(req.status).toBe(401);
  });
});