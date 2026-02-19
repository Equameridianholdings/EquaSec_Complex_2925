import { UserDTO } from "./userDTO.js";

export interface vehicleDTO {
    _id?: string;
    make: string;
    model: string;
    registrationNumber: string;
    user?: UserDTO;
    year: number;
}