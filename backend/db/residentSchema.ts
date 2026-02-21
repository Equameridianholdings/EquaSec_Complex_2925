import mongoose from "mongoose";

const resident = new mongoose.Schema({
  userId: { required: false, type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  name: { required: true, type: String },
  surname: { required: true, type: String },
  emailAddress: { required: true, type: String, unique: true },
  cellNumber: { required: true, type: String },
  idNumber: { required: false, type: String },
  residenceType: { required: true, type: String },
  complex: { required: false, type: Object },
  gatedCommunity: { required: false, type: Object },
  communityId: { required: false, type: String },
  communityResidenceType: { required: false, type: String },
  communityComplexId: { required: false, type: String },
  unitNumber: { required: false, type: String },
  houseNumber: { required: false, type: String },
  address: { required: true, type: String },
  vehicles: {
    required: false,
    type: [
      {
        make: { type: String, required: true },
        model: { type: String, required: true },
        reg: { type: String, required: true },
        color: { type: String, required: false },
      },
    ],
    default: [],
  },
  securityCompany: { required: false, type: Object },
  createdBy: { required: false, type: String },
  createdAt: { required: true, type: Date, default: Date.now },
});

const residentSchema = mongoose.model("Resident", resident);

export default residentSchema;