import { testUser } from "#__tests__/testUser.js";
import { ResponseBody } from "#app.js";
import { visitorDTO } from "#interfaces/visitorDTO.js";
import GenerateJWT from "#utils/generateJWT.js";
import { beforeEach, describe, expect, it } from "vitest";

const visitorWalking: visitorDTO = {
  access: false,
  contact: "0987654321",
  driving: false,
  name: "Test",
  surname: "Dummy",
  validity: false,
};

const visitorDriving: visitorDTO = {
  access: false,
  contact: "0987654321",
  driving: false,
  name: "Test",
  surname: "Dummy",
  validity: false,
  vehicle: {
    color: "Blue",
    make: "Test",
    model: "Dummy",
    registrationNumber: "tst123gp",
  },
};

describe.each([[visitorWalking], [visitorDriving]])("Visitor route endpoints", (visitor: visitorDTO) => {
  let token: string;
  beforeEach(() => {
    token = GenerateJWT(testUser.emailAddress, testUser.type);
  });
  
  it.todo("Should add a new visitor and return a 201 response", async () => {
    const req = await fetch("http://localhost:3000/visitor/", {
      body: JSON.stringify(visitor),
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const res = req.json() as unknown as ResponseBody;

    expect(req.status).toBe(201);
    expect(res.payload).toBeTruthy();
  });

  it.todo("Should get all visitors by security and return 200 response");

  it.todo("Should get all visitors by user and return 200 response");

  it.todo("Should grant access to a visitor and return a 200 response");
});