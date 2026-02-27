import mongoose from "mongoose";

const user = new mongoose.Schema({
    address: { required: false, type: String },
    cellNumber: {required: true, type: String},
    communityComplexId: { required: false, type: String },
    communityId: { required: false, type: String },
    communityResidenceType: { required: false, type: String },
    complex: {type: Object},
    emailAddress: {required: true, type: String, unique: true},
    gatedCommunity: { required: false, type: Object },
    houseNumber: { required: false, type: String },
    idNumber: { required: false, type: String, unique: true},
    movedOut: {type: Boolean},
    name: {required: true, type: String},
    password: { required: true, type: String, unique: true},
    profilePhoto: {type: String},
    residenceType: { required: false, type: String },
    salt: { required: true, type: String, unique: true},
    securityCompany: { type: Object },
    surname: {required: true, type: String},
    type: { default: ["user"], required: true, type: Array}, // User or Admin or Security or Security-admin
    unitNumber: { required: false, type: String },
    verificationCode: { required: false, type: String },
    verificationCodeCreatedAt: { required: false, type: Date },
})

const userSchema = mongoose.model("User", user);

export default userSchema;