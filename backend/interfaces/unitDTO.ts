import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";
import { UserDTO } from "./userDTO.js";

export interface unitDTO {
  _id?: string;
  complex: complexDTO;
  number: number;
  numberOfParkingBays: number;
  numberOfRooms: number;
  occupied: boolean;
  users: UserDTO[];
}

export const unitBodyValidation = checkSchema({
  complex: {
    errorMessage: "Field is required",
    isEmpty: false,
    isObject: true,
  },
  number: {
    errorMessage: "Field is required",
    isEmpty: false,
    isNumeric: true,
  },
  numberOfParkingBays: {
    errorMessage: "Field is required",
    isEmpty: false,
    isNumeric: true,
  },
  numberOfRooms: {
    errorMessage: "Field is required",
    isEmpty: false,
    isNumeric: true,
  },
  occupied: {
    errorMessage: "Field is required",
    isBoolean: true,
    isEmpty: false,
  },
});
