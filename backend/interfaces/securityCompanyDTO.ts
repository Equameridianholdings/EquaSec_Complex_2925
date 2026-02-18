import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber: string;
    complex?: complexDTO;
    contractEndDate: Date;
    contractStartDate: Date;
    psiraNumber: string;
    sosOptin: boolean;
    userName: string;
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