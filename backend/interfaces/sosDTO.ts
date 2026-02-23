import { checkSchema, Schema } from "express-validator";

import { UserDTO } from "./userDTO.js";

export interface SOSDTO {
    _id?: string;
    date: Date;
    guard: UserDTO;
    station?: {
        complexAddress?: null | string;
        complexId?: string;
        complexName?: string;
        gatedCommunityId?: string;
        gatedCommunityName?: string;
        name?: string;
        type?: "complex" | "gated" | "unknown";
    };
}

const sosValidationSchema: Schema = {
    date: {
        errorMessage: "Invalid date",
        exists: {
            errorMessage: "Field is required",
        },
        isISO8601: true,
    },
    guard: {
        exists: {
            errorMessage: "Field is required",
        },
        isObject: true,
    },
};

export const sosBodyValidation = checkSchema(sosValidationSchema);