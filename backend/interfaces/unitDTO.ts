import { complexDTO } from "./complexDTO.js";

export interface unitDTO {
    _id: string;
    complex: complexDTO;
    number: number;
    numberOfParkingBays: number;
    numberOfRooms: number;
    occupied: boolean;
}