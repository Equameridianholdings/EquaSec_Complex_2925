import { complexDTO } from "./complexDTO.js";
import { unitDTO } from "./unitDTO.js";

export interface UserDTO {
    _id?: string;
    accessPin: string;
    cellNumber: string;
    complex?: complexDTO;
    emailAddress: string;
    movedOut: boolean;
    name: string;
    password?: string;
    profilePhoto: string;
    salt?: string;
    surname: string;
    type: string;
    unit: unitDTO;
}