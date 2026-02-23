import { Int32 } from "mongodb";
import mongoose from "mongoose";

const complex = new mongoose.Schema({
    address: { required: true, type: String},
    name: { required: true, type: String, unique: true},
    numberOfUnits: { required: true, type: Int32},
    price: { required: true, type: Number },
    gatedCommunityName: { required: false, type: String },
    parkingMode: { required: true, type: String },
    fixedParkingCount: { required: false, type: Number },
    parkingIsUnlimited: { required: true, type: Boolean },
    blocks: {
        required: false,
        type: [
            {
                name: { type: String, required: true },
                numberOfUnits: { type: Number, required: true },
            },
        ],
        default: [],
    },
});

const complexSchema = mongoose.model("Complex", complex);

export default complexSchema;