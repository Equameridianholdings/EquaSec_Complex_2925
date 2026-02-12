import mongoose from "mongoose";

const securityCompany = new mongoose.Schema({
    cipcRegistrationNumber: { required: true, type: String, unique: true },
    complex: { required: true, type: Object },
    contractEndDate: { required: true, type: Date },
    contractStartDate: { required: true, type: Date },
    psiraNumber: { required: true, type: String },
    registrationCode: { required: true, type: String },
    sosOptin: { required: true, type: Boolean },
    userName: { required: true, type: String },
});

const securityCompanySchema =  mongoose.model("SecurityCompany", securityCompany);

export default securityCompanySchema;