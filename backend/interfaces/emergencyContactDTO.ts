import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { SecurityCompanyDTO } from "./securityCompanyDTO.js";

export interface emergencyContactDTO {
    _id?: string;
    active: boolean;
    contact: string;
    email?: string;
    name: string;
    securityCompany: SecurityCompanyDTO;
    surname?: string;
}

export const emergencyContactBodyValidation = checkSchema({
    active: {
        errorMessage: "Field must be of type bool",
        isBoolean: true,
        isEmpty: false,
    },
    contact: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid cell number length.",
            options: {
                max: 10,
                min: 12,
            },
        }
    },
    emailAddress: {
        errorMessage: "Invalid email address.",
        isEmail: true,
        normalizeEmail: true,
    },
    name: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid name length.",
            options: {
                max: 255,
            },
        }
    },
    securityCompany: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    surname: {
        isLength: {
            errorMessage: "Invalid name length.",
            options: {
                max: 255,
            },
        }
    }
});