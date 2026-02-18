import { checkSchema } from "express-validator/lib/middlewares/schema.js";

import { SOSDTO } from "./sosDTO.js";

export interface incidentDTO {
    _id?: string;
    description: string;
    sos: SOSDTO;
}

export const incidentBodyValidation = checkSchema({
    desciption: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
    sos: {
        errorMessage: "Field is required",
        isEmpty: false,
    },
}) 