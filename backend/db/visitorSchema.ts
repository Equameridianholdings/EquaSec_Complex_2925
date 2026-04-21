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
    driving: { required: true, type: Boolean },
    expiry: { required: true, type: Date },
    name: { required: true, type: String },
    surname: { required: true, type: String },
    validity: { required: true, type: Boolean },
    vehicle: { required: false, type: Object },
    idPhoto: { required: false, type: String },
    diskPhoto: { required: false, type: String },
  },
  { collection: "visitors" },
);

const visitorShema = mongoose.model("Visitor", visitor);

export default visitorShema;
