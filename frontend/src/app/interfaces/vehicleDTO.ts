import { UserDTO } from "./userDTO.js";

export interface vehicleDTO {
    _id?: string;
    colour: string;
    make: string;
    model: string;
    registrationNumber: string;
    user?: UserDTO;
}