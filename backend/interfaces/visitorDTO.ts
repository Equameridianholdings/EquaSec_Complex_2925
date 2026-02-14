import { UserDTO } from "./userDTO.js";
import { vehicleDTO } from "./vehicleDTO.js";

export interface visitorDTO {
    _id?: string;
    access: boolean;
    code?: number;
    driving: boolean;
    expiry?: Date;
    invitee: visitor;
    user: UserDTO;
    validity: boolean,
    vehicle: vehicleDTO;
}

interface visitor {
    contact: string;
    name: string;
    surname: string;
}