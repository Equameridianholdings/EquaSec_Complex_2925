import { checkSchema } from "express-validator/lib/middlewares/schema.js";

export interface complexDTO {
    _id?: string;
    address: string;
    name: string;
    numberOfUnits: number;
}

export const complexBodyValidation = checkSchema({
    address: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid address length",
            options: {
                max: 255,
            },
        }
    },
    name: {
        errorMessage: "Field is required",
        isEmpty: false,
        isLength: {
            errorMessage: "Invalid name length",
            options: {
                max: 255,
            },
        }
    },
    numberOfUnits: {
        errorMessage: "Field must be of numeric type.",
        isEmpty: false,
        isNumeric: true,
    }
})