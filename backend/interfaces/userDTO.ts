import { Schema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongoose";

import { complexDTO } from "./complexDTO.js";
import { unitDTO } from "./unitDTO.js";

export interface UserDTO {
    _id?: ObjectId;
    cellNumber: string;
    complex?: complexDTO;
    confirmPassword: string;
    emailAddress: string;
    idNumber?: string;
    movedOut: boolean;
    name: string;
    password: string;
    profilePhoto: string;
    salt?: string;
    surname: string;
    type: string[];
    unit?: unitDTO;
}

export const userBodyValidation: Schema = {
    cellNumber: {
        isLength: {
            errorMessage: "Invalid cell number length.",
            options: {
                max: 12,
                min: 10,
            },
        },
    },
    confirmPassword:{
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid password length or pattern.",
            options: {
                max: 6,
                min: 6,
            },
        }
    },
    emailAddress: {
        errorMessage: "Invalid email address.",
        isEmail: true,
        isEmpty: false,
        normalizeEmail: true,
    },
    // idNumber: {
    //     errorMessage: "Field is required",
    //     isEmpty: false,
    // },
    movedOut: {
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
    password: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid password length or pattern.",
            options: {
                max: 6,
                min: 6,
            },
        }
    },
    profilePhoto: {
        errorMessage: "Field is required",
        isBase64: true,
        isEmpty: false,
    },
    salt: {
        errorMessage: "Field is not required or optional",
        isEmpty: true,
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
    type: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    unit: {
        errorMessage: "Field is required",
        isEmpty: false,
        isObject: true,
    },
};