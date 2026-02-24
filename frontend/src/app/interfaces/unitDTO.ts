import { complexDTO } from "./complexDTO.js";
import { gatedCommunityDTO } from "./gatedCommunityDTO.js";
import { UserDTO } from "./userDTO.js";

export interface unitDTO {
  _id?: string;
  complex: complexDTO;
  gatedCommunity?: gatedCommunityDTO;
  number: number;
  numberOfParkingBays: number;
  users: UserDTO[];
}