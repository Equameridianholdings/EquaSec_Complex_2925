import mongoose from "mongoose";

const user = new mongoose.Schema({
    cellNumber: {required: true, type: String},
    emailAddress: {required: true, type: String, unique: true},
    name: {required: true, type: String},
    surname: {required: true, type: String},
    type: {required: true, type: String},
    unit: {type: Object},
})

const userSchema = mongoose.model("User", user);

export default userSchema;