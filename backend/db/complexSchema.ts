import { Int32 } from "mongodb";
import mongoose from "mongoose";

const complex = new mongoose.Schema({
    address: { required: true, type: String},
    name: { required: true, type: String, unique: true},
    numberOfUnits: { required: true, type: Int32},
});

const complexSchema = mongoose.model("Complex", complex);

export default complexSchema;