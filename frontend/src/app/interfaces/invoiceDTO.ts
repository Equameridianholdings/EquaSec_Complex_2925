import { unitDTO } from "./unitDTO.js";

export interface invoiceDTO {
  _id?: any;
  amount: number;
  dueDate: Date;
  invoiceStatus: string;
  isSubscribed: boolean;
  issueDate: Date;
  unit?: unitDTO;
}
