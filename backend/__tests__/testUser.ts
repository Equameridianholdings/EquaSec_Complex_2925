import { UserDTO } from "#interfaces/userDTO.js";

export const testUser: UserDTO = {
  cellNumber: "0987654321",
  complex: undefined,
  confirmPassword: "123456",
  emailAddress: "test@test.com",
  idNumber: "",
  movedOut: false,
  name: "TestName",
  password: "123456",
  profilePhoto: "",
  salt: "",
  surname: "TestSurname",
  type: ["tenant"],
  visitorsTokens: 0
};
