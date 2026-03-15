import { complexDTO } from "./complexDTO.js";
import { gatedCommunityDTO } from "./gatedCommunityDTO.js";
import { UserDTO } from "./userDTO.js";

export interface unitDTO {
  _id?: string;
  complex?: complexDTO;
  gatedCommunity?: gatedCommunityDTO;
  house: boolean;
  number: number;
  numberOfParkingBays: number;
  users: UserDTO[];
}