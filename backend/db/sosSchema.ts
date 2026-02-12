import mongoose from "mongoose";

const sos = new mongoose.Schema({
    date: { required: true, type: Date },
    guard: { required: true, type: Object },
});

const sosSchema = mongoose.model("SOS", sos);

export default sosSchema;