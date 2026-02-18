import { testUser } from "#__tests__/testUser.js";
import { ResponseBody } from "#app.js";
import { vehicleDTO } from "#interfaces/vehicleDTO.js";
import { beforeEach, describe, expect, it } from "vitest";

describe("Complex endpoints for api", () => {
  let token: string;
  const URI: string = process.env.TEST_SERVER_URI as unknown as string;

  const vehicle: vehicleDTO = {
    make: "renualt",
    model: "clio",
    registrationNumber: "qwe123gp",
    user: undefined,
    year: 2005,
  };

  beforeEach(async () => {
    const req = await fetch(`${URI}/user/login`, {
      body: JSON.stringify({emailAddress: testUser.emailAddress, password: testUser.password}),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const res = req.json() as unknown as ResponseBody;
    
    token = res.payload as string;
    console.log(token);
  });

  it("Should add new vehciles and return a 201 code", async () => {
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

  //   it("Should update a vehicle and return a 200 code", () => {});

  //   it("Should remove a vehicle and return a 200 code", () => {});

  //   it("Should get all vehicles under a community area and return a 200 code", () => {});

  //   it("Should get all vehicles under a complex and return a 200 code", () => {});

  //   it("Should get all vehicles and return a 200 code", () => {});

  //   it("Should get a single vehicle and return a 200 code", () => {});
});