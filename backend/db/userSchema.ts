import mongoose from "mongoose";

const user = new mongoose.Schema({
    cellNumber: {required: true, type: String},
    complex: {type: Object},
    emailAddress: {required: true, type: String, unique: true},
    movedOut: {type: Boolean},
    name: {required: true, type: String},
    password: { required: true, type: String, unique: true},
    profilePhoto: {type: String},
    salt: { required: true, type: String, unique: true},
    surname: {required: true, type: String},
    type: { default: "user", required: true, type: String}, // User or Admin or Security or Security-admin
    unit: {type: Object},
})

const userSchema = mongoose.model("User", user);

export default userSchema;