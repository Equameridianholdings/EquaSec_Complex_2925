import { Int32 } from "mongodb";
import mongoose from "mongoose";

const visitor = new mongoose.Schema(
  {
    access: { required: true, type: Boolean },
    arrivedAt: { required: false, type: Date },
    bookedAt: { required: false, type: Date },
    code: { required: false, type: Int32 },
    contact: { required: true, type: String },
    destination: { required: true, type: Object },
    diskPhoto: { required: false, type: String },
    driving: { required: true, type: Boolean },
    expiry: { required: true, type: Date },
    idPhoto: { required: false, type: String },
    name: { required: true, type: String },
    selfCheckInToken: { required: false, sparse: true, type: String, unique: true },
    selfCheckInUsed: { default: false, required: false, type: Boolean },
    surname: { required: true, type: String },
    validity: { required: true, type: Boolean },
    vehicle: { required: false, type: Object },
  },
  { collection: "visitors" },
);

const visitorShema = mongoose.model("Visitor", visitor);

export default visitorShema;
