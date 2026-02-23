import mongoose from "mongoose";

const securityCompany = new mongoose.Schema({
    cipcRegistrationNumber: { required: true, type: String, unique: true },
    contactNumber: {required: true, type: String},
    contract: { required: false, type: Array, default: [] },
    contractEndDate: { required: false, type: Date },
    contractStartDate: { required: false, type: Date },
    email: {required: true, type: String},
    name: {required: true, type: String},
    psiraNumber: { required: true, type: String },
    sosOptin: { required: true, type: Boolean },
    userName: { required: false, type: String },
    managerEmail: { required: false, type: String },
    managerCode: { required: false, type: String },
    managerUserId: { required: false, type: mongoose.Schema.Types.ObjectId, ref: "User" },
    employeeAssignments: {
        required: false,
        type: [
            {
                userId: { type: String, required: true },
                assignedComplexes: { type: [String], default: [] },
                assignedCommunities: { type: [String], default: [] },
                position: { type: String, required: false },
                status: { type: String, required: false },
                contractStartDate: { type: Date, required: false },
                contractEndDate: { type: Date, required: false },
                createdBy: { type: String, required: false },
            },
        ],
        default: [],
    },
});

const securityCompanySchema =  mongoose.model("SecurityCompany", securityCompany);

export default securityCompanySchema;