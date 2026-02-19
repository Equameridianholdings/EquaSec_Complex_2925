import { complexDTO } from "./complexDTO.js";

export interface UserDTO {
    _id?: string;
    cellNumber: string;
    complex?: complexDTO;
    confirmPassword: string;
    emailAddress: string;
    idNumber?: string;
    movedOut: boolean;
    name: string;
    password: string;
    profilePhoto: string;
    salt?: string;
    surname: string;
    type: string[];
}

export interface loginDTO {
    emailAddress: string;
    password: string;
}