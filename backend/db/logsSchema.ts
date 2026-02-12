import mongoose from "mongoose";

const log = new mongoose.Schema({
    date: { required: true, type: Date},
    guard: { required: true, type: Object},
    visitor: { required: true, type: Object},
});

const logSchema = mongoose.model("Log", log);

export default logSchema;