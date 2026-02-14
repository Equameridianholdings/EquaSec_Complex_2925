import { UserDTO } from "./userDTO.js";

export interface subTenantDTO {
    _id?: string;
    age: number;
    contact?: string;
    gender: string;
    name: string;
    surname: string;
    user: UserDTO;
}