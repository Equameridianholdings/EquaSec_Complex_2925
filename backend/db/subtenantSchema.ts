import { Int32 } from "mongodb";
import mongoose from "mongoose";

const subTenant = new mongoose.Schema({
    age: { required: true, type: Int32 },
    contact: { type: String },
    gender: { required: true, type: String },
    name: { required: true, type: String },
    surname: { required: true, type: String },
    user: { required: true, type: Object },
});

const subTenantSchema = mongoose.model("SubTenant", subTenant);

export default subTenantSchema;