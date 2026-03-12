import { Int32 } from "mongodb";
import mongoose from "mongoose";

const gatedCommunity = new mongoose.Schema({
    name: {required: true, type: String},
    numberOfComplexes: { type: Int32 },
    numberOfHouses: { type: Int32 },
    price: { type: Number },
});

const gatedCommunitySchema = mongoose.model("Gated Community", gatedCommunity);

export default gatedCommunitySchema;