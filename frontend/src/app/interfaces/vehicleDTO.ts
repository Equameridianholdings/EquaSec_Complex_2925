import { UserDTO } from "./userDTO.js";

export interface vehicleDTO {
    _id?: string;
    color: string;
    make: string;
    model: string;
    registrationNumber: string;
    user?: any;
}