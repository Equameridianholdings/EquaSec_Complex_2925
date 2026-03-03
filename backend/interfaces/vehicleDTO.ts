import { Schema } from "express-validator/lib/middlewares/schema.js";

import { UserDTO } from "./userDTO.js";

export interface vehicleDTO {
    _id?: string;
    color: string;
    make: string;
    model: string;
    registrationNumber: string;
    user?: UserDTO;
}

export const vehicleBodyValidation: Schema = {
    make: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid make length",
            options: {
                max: 255,
            },
        },
    },
    model: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid make length",
            options: {
                max: 255,
            },
        },
    },
    registrationNumber: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid registration number length",
            options: {
                max: 8,
                min: 8,
            },
        },
    },
    user: {
        errorMessage: "Field must be of type object.",
        isObject: true,
    },
    year: {
        errorMessage: "Field is required",
        isEmpty: false,
        isNumeric: true,
    },
};