import { SecurityCompanyDTO } from "./securityCompanyDTO.js";

export interface emergencyContactDTO {
    _id?: string;
    active: boolean;
    contact: string;
    email?: string;
    name: string;
    securityCompany: SecurityCompanyDTO;
    surname?: string;
}