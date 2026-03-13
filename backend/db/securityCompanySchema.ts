import mongoose from "mongoose";

const securityCompany = new mongoose.Schema({
    cipcRegistrationNumber: { required: false, trim: true, type: String },
    contactNumber: {required: true, type: String},
    contract: { default: [], required: false, type: Array },
    contractEndDate: { required: false, type: Date },
    contractStartDate: { required: false, type: Date },
    email: {required: true, type: String},
    employeeAssignments: {
        default: [],
        required: false,
        type: [
            {
                assignedCommunities: { default: [], type: [String] },
                assignedComplexes: { default: [], type: [String] },
                contractEndDate: { required: false, type: Date },
                contractStartDate: { required: false, type: Date },
                createdBy: { required: false, type: String },
                position: { required: false, type: String },
                status: { required: false, type: String },
                userId: { required: true, type: String },
            },
        ],
    },
    managerCode: { required: false, type: String },
    managerEmail: { required: false, type: String },
    managerUserId: { ref: "User", required: false, type: mongoose.Schema.Types.ObjectId },
    name: {required: true, type: String},
    psiraNumber: { required: false, trim: true, type: String },
    sosOptin: { required: true, type: Boolean },
    userName: { required: false, type: String },
});

securityCompany.index(
    { cipcRegistrationNumber: 1 },
    {
        partialFilterExpression: {
            cipcRegistrationNumber: { $type: "string" },
        },
    },
);

const securityCompanySchema =  mongoose.model("SecurityCompany", securityCompany);

export default securityCompanySchema;