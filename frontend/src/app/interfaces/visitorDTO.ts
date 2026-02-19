import { UserDTO } from "./userDTO.js";
import { vehicleDTO } from "./vehicleDTO.js";

export interface visitorDTO {
    _id?: string;
    access: boolean;
    code?: number;
    contact: string;
    driving: boolean;
    expiry?: Date;
    name: string;
    surname: string;
    user: UserDTO;
    validity: boolean,
    vehicle: vehicleDTO;
}