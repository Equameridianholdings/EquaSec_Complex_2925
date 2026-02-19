import { complexDTO } from './complexDTO.js';

export interface SecurityCompanyDTO {
    _id?: string;
    cipcRegistrationNumber: string;
    contactNumber: string;
    contract?: Contract[];
    email: string;
    name: string;
    psiraNumber: string;
    sosOptin: boolean;
    userName?: string;
}

export interface Contract {
    complex: complexDTO;
    contractEndDate?: Date;
    contractStartDate?: Date;
}