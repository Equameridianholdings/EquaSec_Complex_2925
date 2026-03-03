import { Int32 } from "mongodb";
import mongoose from "mongoose";

const visitor = new mongoose.Schema(
  {
    access: { required: true, type: Boolean },
    code: { required: false, type: Int32 },
    contact: { required: true, type: String },
    driving: { required: true, type: Boolean },
    expiry: { required: true, type: Date },
    name: { required: true, type: String },
    surname: { required: true, type: String },
    user: { required: true, type: Object },
    validity: { required: true, type: Boolean },
    vehicle: { required: false, type: Object },
  },
  { collection: "visitors" },
);

const visitorShema = mongoose.model("Visitor", visitor);

export default visitorShema;
