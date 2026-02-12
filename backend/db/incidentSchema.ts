import mongoose from "mongoose";

const incident = new mongoose.Schema({
    description: { required: true, type: String },
    sos: { required: true, type: Object },
});

const incidentSchema = mongoose.model("Incident", incident);

export default incidentSchema;