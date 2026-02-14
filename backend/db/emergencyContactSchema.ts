import mongoose from "mongoose";

const emergencyContact = new mongoose.Schema({
    active: { required: true, type: Boolean },
    contact: { required: true, type: String },
    email: { type: String },
    name: { required: true, type: String },
    securityCompany: { required: true, type: Object },
    surname: { type: String },
});

const emergencyContactSchema = mongoose.model("EmergencyContact", emergencyContact);

export default emergencyContactSchema;