import { checkSchema } from "express-validator/lib/middlewares/schema.js";

export interface complexDTO {
    _id?: string;
    address: string;
    name: string;
    numberOfUnits: number;
    price: number;
    parkingMode: 'fixed' | 'per-unit';
    fixedParkingCount?: number | null;
    parkingIsUnlimited: boolean;
    unitParkingConfig?: Array<{ unitNumber: number; parkingBays: number }>;
    blocks?: Array<{ name: string; numberOfUnits: number }>;
    gatedCommunityName?: string;
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
    },
    price: {
        errorMessage: "Field must be of numeric type.",
        isEmpty: false,
        isNumeric: true,
    },
    parkingMode: {
        errorMessage: "Field must be fixed or per-unit.",
        isEmpty: false,
        isIn: {
            options: [['fixed', 'per-unit']],
        },
    },
    fixedParkingCount: {
        optional: true,
        errorMessage: "Field must be of numeric type.",
        isNumeric: true,
    },
    parkingIsUnlimited: {
        errorMessage: "Field must be boolean.",
        isEmpty: false,
        isBoolean: true,
    },
    unitParkingConfig: {
        optional: true,
        errorMessage: "Field must be an array.",
        isArray: true,
    },
    blocks: {
        optional: true,
        errorMessage: "Field must be an array.",
        isArray: true,
    },
    gatedCommunityName: {
        optional: true,
        errorMessage: "Field must be a string.",
        isString: true,
        isLength: {
            errorMessage: "Invalid gated community name length",
            options: {
                max: 255,
            },
        },
    },
    'blocks.*.name': {
        optional: true,
        errorMessage: "Block name is required",
        isEmpty: false,
    },
    'blocks.*.numberOfUnits': {
        optional: true,
        errorMessage: "Block numberOfUnits must be numeric",
        isNumeric: true,
    },
})