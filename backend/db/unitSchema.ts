import { Int32 } from "mongodb";
import mongoose from "mongoose";

const unit = new mongoose.Schema({
    complex: { required: true, type: Object},
    number: { required: true, type: Int32},
});

const unitSchema = mongoose.model("Unit", unit);

export default unitSchema;