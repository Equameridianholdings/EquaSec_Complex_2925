import mongoose from "mongoose";

const user = new mongoose.Schema({
    cellNumber: {required: true, type: String},
    complex: {type: Object},
    emailAddress: {required: true, type: String, unique: true},
    idNumber: { type: String, unique: true, sparse: true},
    movedOut: {type: Boolean},
    name: {required: true, type: String},
    password: { required: true, type: String, unique: true},
    profilePhoto: {type: String},
    address: { required: false, type: String },
    residenceType: { required: false, type: String },
    gatedCommunity: { required: false, type: Object },
    communityId: { required: false, type: String },
    communityResidenceType: { required: false, type: String },
    communityComplexId: { required: false, type: String },
    unitNumber: { required: false, type: String },
    houseNumber: { required: false, type: String },
    salt: { required: true, type: String, unique: true},
    surname: {required: true, type: String},
    type: { default: "user", required: true, type: Array}, // User or Admin or Security or Security-admin
    verificationCode: { required: false, type: String },
    verificationCodeCreatedAt: { required: false, type: Date },
    securityCompany: { type: Object },
})

const userSchema = mongoose.model("User", user);

export default userSchema;