import { Int32 } from "mongodb";
import mongoose from "mongoose";

const vehicle = new mongoose.Schema({
    color: { required: false, type: String },
    make: { required: true, type: String },
    model: { required: true, type: String },
    registerationNumber: { required: true, type: String },
    user: { type: Object},
    year: { default: 0, required: false, type: Int32 },
})

const vehicleSchema = mongoose.model("Vehicle", vehicle);

export default vehicleSchema;