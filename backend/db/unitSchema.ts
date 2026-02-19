import { Int32 } from "mongodb";
import mongoose from "mongoose";

const unit = new mongoose.Schema({
    complex: { required: true, type: Object},
    number: { required: true, type: Int32},
    numberOfParkingBays: {required: true, type: Int32},
    numberOfRooms: {required: true, type: Int32},
    occupied: {requred: true, type: Boolean},
    users: {type: Array},
});

const unitSchema = mongoose.model("Unit", unit);

export default unitSchema;