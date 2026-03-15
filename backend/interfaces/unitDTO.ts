import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";
import { gatedCommunityDTO } from "./gatedCommunityDTO.js";
import { UserDTO } from "./userDTO.js";

export interface unitDTO {
  _id?: string;
  complex?: complexDTO;
  gatedCommunity?: gatedCommunityDTO; 
  house?: boolean;
  number: number;
  numberOfParkingBays: number;
  users: UserDTO[];
}

export const unitBodyValidation = checkSchema({
  complex: {
    isObject: true,
    optional: true,
  },
  gatedCommunity: {
    isObject: true,
    optional: true,
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
});
