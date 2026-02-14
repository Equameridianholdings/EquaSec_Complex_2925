import { Int32 } from "mongodb";
import mongoose from "mongoose";

const vehicle = new mongoose.Schema({
    make: { required: true, type: String },
    model: { required: true, type: String },
    registerationNumber: { required: true, type: String },
    user: { type: Object},
    year: { required: true, type: Int32},
})

const vehicleSchema = mongoose.model("Vehicle", vehicle);

export default vehicleSchema;