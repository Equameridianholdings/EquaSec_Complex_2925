import { checkSchema } from "express-validator/lib/middlewares/schema.js";

export interface complexDTO {
    _id?: string;
    address: string;
    blocks?: { name: string; numberOfUnits: number }[];
    fixedParkingCount?: null | number;
    gatedCommunityName?: string;
    name: string;
    numberOfUnits: number;
    parkingIsUnlimited: boolean;
    parkingMode: 'fixed' | 'per-unit';
    price: number;
    unitParkingConfig?: { parkingBays: number; unitNumber: number; }[];
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
    blocks: {
        errorMessage: "Field must be an array.",
        isArray: true,
        optional: true,
    },
    'blocks.*.name': {
        errorMessage: "Block name is required",
        isEmpty: false,
        optional: true,
    },
    'blocks.*.numberOfUnits': {
        errorMessage: "Block numberOfUnits must be numeric",
        isNumeric: true,
        optional: true,
    },
    fixedParkingCount: {
        errorMessage: "Field must be of numeric type.",
        isNumeric: true,
        optional: true,
    },
    gatedCommunityName: {
        errorMessage: "Field must be a string.",
        isLength: {
            errorMessage: "Invalid gated community name length",
            options: {
                max: 255,
            },
        },
        isString: true,
        optional: true,
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
    },
    parkingIsUnlimited: {
        errorMessage: "Field must be boolean.",
        isBoolean: true,
        isEmpty: false,
    },
    parkingMode: {
        errorMessage: "Field must be fixed or per-unit.",
        isEmpty: false,
        isIn: {
            options: [['fixed', 'per-unit']],
        },
    },
    price: {
        errorMessage: "Field must be of numeric type.",
        isEmpty: false,
        isNumeric: true,
    },
    unitParkingConfig: {
        errorMessage: "Field must be an array.",
        isArray: true,
        optional: true,
    },
})