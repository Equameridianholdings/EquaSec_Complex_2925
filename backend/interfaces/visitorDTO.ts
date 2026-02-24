import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { UserDTO } from "./userDTO.js";
import { vehicleDTO } from "./vehicleDTO.js";

export interface visitorDTO {
  _id?: string;
  access: boolean;
  code?: number;
  contact: string;
  driving: boolean;
  expiry?: Date;
  name: string;
  surname: string;
  user?: UserDTO;
  validity: boolean;
  vehicle?: vehicleDTO;
}

export const visitorBodyValidation = checkSchema({
  access: {
    errorMessage: "Field is required",
    isBoolean: true,
    isEmpty: false,
  },
  code: {
    errorMessage: "Field is not required or optional",
    isEmpty: true,
  },
  contact: {
    errorMessage: "Field is required",
    isEmpty: false,
    isLength: {
      errorMessage: "Invalid phone number length.",
      options: {
        max: 12,
        min: 10,
      },
    },
  },
  driving: {
    errorMessage: "Field is required",
    isBoolean: true,
    isEmpty: false,
  },
  name: {
    errorMessage: "Field is required",
    isEmpty: false,
    isLength: {
      errorMessage: "Invalid name length",
      options: {
        max: 255,
      },
    },
  },
  surname: {
    errorMessage: "Field is required",
    isEmpty: false,
    isLength: {
      errorMessage: "Invalid surname length",
      options: {
        max: 255,
      },
    },
  },
});
