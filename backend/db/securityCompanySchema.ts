import mongoose from "mongoose";

const securityCompany = new mongoose.Schema({
    cipcRegistrationNumber: { required: true, type: String, unique: true },
    contactNumber: {required: true, type: String},
    contract: { required: true, type: Array },
    contractEndDate: { required: true, type: Date },
    contractStartDate: { required: true, type: Date },
    email: {required: true, type: String},
    name: {required: true, type: String},
    psiraNumber: { required: true, type: String },
    sosOptin: { required: true, type: Boolean },
    userName: { required: true, type: String },
});

const securityCompanySchema =  mongoose.model("SecurityCompany", securityCompany);

export default securityCompanySchema;