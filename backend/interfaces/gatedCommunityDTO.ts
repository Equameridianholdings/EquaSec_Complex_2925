import { Schema } from "express-validator/lib/middlewares/schema.js";

export interface gatedCommunityDTO {
    _id?: string;
    name: string;
    numberOfComplexes: number;
    numberOfHouses: number;
}

export const gatedCommunityBodyValidation: Schema = {
    name: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    numberOfComplexes: {
        isNumeric: true,
    },
    numberOfHouses: {
        isNumeric: true,
    },
}