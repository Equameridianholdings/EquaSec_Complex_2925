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
  unit: {
    complex: {
      address: "125 Test St, Test",
      name: "2nd Test Estate",
      numberOfUnits: 50,
    },
    number: 1,
    numberOfParkingBays: 2,
    numberOfRooms: 2,
    occupied: true,
  },
};
