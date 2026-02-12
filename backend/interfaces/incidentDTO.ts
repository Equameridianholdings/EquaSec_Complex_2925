import { SOSDTO } from "./sosDTO.js";

export interface incidentDTO {
    _id?: string;
    description: string;
    sos: SOSDTO;
}