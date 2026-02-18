import { UserDTO } from "./userDTO.js";
import { visitorDTO } from "./visitorDTO.js";

export interface logDTO {
    _id?: string;
    date: Date,
    guard: UserDTO;
    visitor: visitorDTO;
}