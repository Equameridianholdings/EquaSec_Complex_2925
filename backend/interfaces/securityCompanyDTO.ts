import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber?: string;
    contactNumber: string;
    contract?: Contract[];
    email: string;
    employeeAssignments?: EmployeeAssignmentDTO[];
    name: string;
    psiraNumber?: string;
    sosOptin: boolean;
    userName?: string;
}

interface Contract {
    complex?: complexDTO;
    complexName?: string;
    contractEndDate?: Date;
    contractStartDate?: Date;
    gatedCommunityName?: string;
}

interface EmployeeAssignmentDTO {
    assignedCommunities?: string[];
    assignedComplexes?: string[];
    contractEndDate?: Date;
    contractStartDate?: Date;
    createdBy?: string;
    position?: string;
    status?: "active" | "inactive";
    userId: string;
}

export const securityCompanyBodyValidation = checkSchema({
    cipcRegistrationNumber: {
        isLength: {
            errorMessage: "Invalid CIPC Registration number",
            options: {
                max: 50,
                min: 1,
            }
        },
        optional: {
            options: {
                checkFalsy: true,
            },
        },
    },
    contactNumber: {
        errorMessage: "Field is required",
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
    psiraNumber: {
        optional: {
            options: {
                checkFalsy: true,
            },
        },
    },
    sosOptin: {
        errorMessage: "Field is required",
        isBoolean: true,
        isEmpty: false,
    },
})