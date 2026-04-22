import { Double } from "mongodb";
import mongoose from "mongoose";

const invoice = new mongoose.Schema({
    amount: { required: true, type: Double},
    dueDate: { required: true, type: Date},
    invoiceStatus: { default: "Due", required: true, type: String},
    isSubscribed: { default: false, required: true, type: Boolean },
    issueDate: { required: true, type: Date},
    unit: { required: true, type: Object}
});

const invoiceSchema = mongoose.model("Invoice", invoice);

export default invoiceSchema;