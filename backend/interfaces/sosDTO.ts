import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { UserDTO } from "./userDTO.js";

export interface SOSDTO {
    _id?: string;
    date: Date;
    guard: UserDTO;
    station?: {
        type?: "complex" | "gated" | "unknown" | string;
        name?: string;
        complexId?: string;
        complexName?: string;
        complexAddress?: string | null;
        gatedCommunityId?: string;
        gatedCommunityName?: string;
    };
}

export const sosBodyValidation = checkSchema({
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
});