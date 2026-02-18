import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { UserDTO } from "./userDTO.js";

export interface SOSDTO {
    _id?: string;
    date: Date;
    guard: UserDTO;
}

export const sosBodyValidation = checkSchema({
    date: {
        errorMessage: "Field is required",
        isDate: true,
        isEmpty: false,
    },
    gaurd: {
        errorMessage: "Field is required",
        isEmpty: false,
        isObject: true,
    },
});