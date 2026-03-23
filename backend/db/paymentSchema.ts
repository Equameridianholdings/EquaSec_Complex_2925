import mongoose from "mongoose";

const payment = new mongoose.Schema({
    amount: { required: true, type: Date},
    date: { required: true, type: Date},
    paymentSignature: { required: true, type: String},
    paymentStatus: { required: true, type: String},
    paymentType: { required: true, type: String},
    user: { required: true, type: Object},
});

const paymentSchema = mongoose.model("Payment", payment);

export default paymentSchema;