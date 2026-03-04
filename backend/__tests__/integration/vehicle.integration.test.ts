import { testUser } from "#__tests__/testUser.js";
import { ResponseBody } from "#app.js";
import { vehicleDTO } from "#interfaces/vehicleDTO.js";
import { beforeEach, describe, expect, it } from "vitest";

describe("Complex endpoints for api", () => {
  let token: string;
  const URI: string = process.env.TEST_SERVER_URI as unknown as string;

  const vehicle: vehicleDTO = {
    color: "Silver",
    make: "renualt",
    model: "clio",
    registrationNumber: "qwe123gp",
    user: undefined,
  };

  beforeEach(async () => {
    const req = await fetch(`${URI}/user/login`, {
      body: JSON.stringify({ emailAddress: testUser.emailAddress, password: testUser.password }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const res = req.json() as unknown as ResponseBody;

    token = res.payload as string;
    console.log(token);
  });

  it.todo("Should add new vehciles and return a 201 code", async () => {
    console.log(token);
    const req = await fetch(`${URI}/vehicle/`, {
      body: JSON.stringify(vehicle),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    expect(req.status).toBe(201);
  });

  it.todo("Should update a vehicle and return a 200 code");

  it.todo("Should remove a vehicle and return a 200 code");

  it.todo("Should get all vehicles under a community area and return a 200 code");

  it.todo("Should get all vehicles under a complex and return a 200 code");

  it.todo("Should get all vehicles and return a 200 code");

  it.todo("Should get a single vehicle and return a 200 code");
});
