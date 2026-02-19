import { UserDTO } from "./userDTO.js";

export interface SOSDTO {
    _id?: string;
    date: Date;
    guard: UserDTO;
}