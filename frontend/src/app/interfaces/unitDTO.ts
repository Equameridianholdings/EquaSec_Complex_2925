import { complexDTO } from "./complexDTO.js";
import { UserDTO } from "./userDTO.js";

export interface unitDTO {
  _id?: string;
  complex: complexDTO;
  number: number;
  numberOfParkingBays: number;
  numberOfRooms: number;
  occupied: boolean;
  users: UserDTO[];
}