import mongoose from "mongoose";

const log = new mongoose.Schema({
    guard: { required: true, type: Object},
    visitor: { required: true, type: Object},
});

const logSchema = mongoose.model("Log", log);

export default logSchema;