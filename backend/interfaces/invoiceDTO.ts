import { ObjectId } from "mongoose";

import { unitDTO } from "./unitDTO.js";

export interface invoiceDTO {
  _id?: ObjectId;
  amount: number;
  dueDate: Date;
  invoiceStatus: string;
  isSubscribed: boolean;
  issueDate: Date;
  unit: unitDTO;
}
