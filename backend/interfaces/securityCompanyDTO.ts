import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber: string;
    contactNumber: string;
    contract?: Contract[];
    email: string;
    name: string;
    psiraNumber: string;
    sosOptin: boolean;
    userName?: string;
}

interface Contract {
    complex: complexDTO;
    contractEndDate?: Date;
    contractStartDate?: Date;
}

export const securityCompanyBodyValidation = checkSchema({
    cipcRegistrationNumber: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid CIPC Registration number",
            options: {
                max: 19,
                min: 19,
            }
        },
    },
    complex: {
        errorMessage: "Field must be of type object.",
        isObject: true,
    },
    contactNumber: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    contractEndDate: {
        errorMessage: "Invalid contract end date",
        isDate: true,
        isEmpty: false,
    },
    contractStartDate: {
        errorMessage: "Invalid contract start date",
        isDate: true,
        isEmpty: false,
    },
    email: {
        errorMessage: "Field is required",
        isEmail: true,
        isEmpty: false,
    },
    name: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Name is too long",
            options: {
                max: 255,
            },
        },
    },
    prisaNumber: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    sosOptin: {
        errorMessage: "Field is required",
        isBoolean: true,
        isEmpty: false,
    },
    userName: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
})