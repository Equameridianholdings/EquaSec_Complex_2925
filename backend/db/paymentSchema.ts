import { Decimal128 } from "mongodb";
import mongoose from "mongoose";

const payment = new mongoose.Schema({
    amount_fee: { required: true, type: Decimal128},
    amount_gross: { required: true, type: Decimal128},
    amount_net: { required: true, type: Decimal128},
    billing_date: { required: false, type: Date},
    date: { required: true, type: Date},
    email_address: { required: true, type: String},
    item_name: { required: true, type: String},
    name_first: { required: true, type: String},
    name_last: { required: true, type: String},
    payment_id: { required: true, type: String},
    payment_status: { required: true, type: String},
    pf_payment_id: { required: true, type: String},
    signature: { required: true, type: String},
    token: { required: false, type: String},
});

const paymentSchema = mongoose.model("Payment", payment);

export default paymentSchema;