import { complexDTO } from './complexDTO.js';
import { gatedCommunityDTO } from './gatedCommunityDTO.js';
import { UserDTO } from './userDTO.js';

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
    employees: employees[];
}

export interface Contract {
    gatedCommunity?: gatedCommunityDTO;
    complex?: complexDTO;
    contractEndDate?: Date;
    contractStartDate?: Date;
}

export interface employees {
    users: UserDTO;
    createdAt: string; 
}