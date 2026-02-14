import { complexDTO } from "./complexDTO.js";

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber: string;
    complex?: complexDTO;
    contractEndDate: Date;
    contractStartDate: Date;
    psiraNumber: string;
    registrationCode: string;
    sosOptin: boolean;
    userName: string;
}