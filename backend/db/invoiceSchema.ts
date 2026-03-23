import mongoose from "mongoose";

const invoice = new mongoose.Schema({
    amount: { required: true, type: Date},
    dueDate: { required: true, type: Date},
    invoiceStatus: { required: true, type: String},
    issueDate: { required: true, type: Date},
    unit: { required: true, type: Object},
});

const invoiceSchema = mongoose.model("Invoice", invoice);

export default invoiceSchema;