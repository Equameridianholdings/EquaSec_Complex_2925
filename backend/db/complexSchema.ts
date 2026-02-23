import { Int32 } from "mongodb";
import mongoose from "mongoose";

const complex = new mongoose.Schema({
    address: { required: true, type: String},
    blocks: {
        default: [],
        required: false,
        type: [
            {
                name: { required: true, type: String },
                numberOfUnits: { required: true, type: Number },
            },
        ],
    },
    fixedParkingCount: { required: false, type: Number },
    gatedCommunityName: { required: false, type: String },
    name: { required: true, type: String, unique: true},
    numberOfUnits: { required: true, type: Int32},
    parkingIsUnlimited: { required: true, type: Boolean },
    parkingMode: { required: true, type: String },
    price: { required: true, type: Number },
});

const complexSchema = mongoose.model("Complex", complex);

export default complexSchema;