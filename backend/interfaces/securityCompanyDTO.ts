import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { complexDTO } from "./complexDTO.js";

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber: string;
    contactNumber: string;
    contract?: Contract[];
    employeeAssignments?: EmployeeAssignmentDTO[];
    email: string;
    name: string;
    psiraNumber: string;
    sosOptin: boolean;
    userName?: string;
}

interface EmployeeAssignmentDTO {
    userId: string;
    assignedComplexes?: string[];
    assignedCommunities?: string[];
    position?: string;
    status?: "active" | "inactive";
    contractStartDate?: Date;
    contractEndDate?: Date;
    createdBy?: string;
}

interface Contract {
    complex?: complexDTO;
    complexName?: string;
    gatedCommunityName?: string;
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
                max: 50,
                min: 1,
            }
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
        errorMessage: "Field is required",
        isEmpty: false,
    },
    sosOptin: {
        errorMessage: "Field is required",
        isBoolean: true,
        isEmpty: false,
    },
})