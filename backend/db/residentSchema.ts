import mongoose from "mongoose";

const resident = new mongoose.Schema({
  address: { required: true, type: String },
  cellNumber: { required: true, type: String },
  communityComplexId: { required: false, type: String },
  communityId: { required: false, type: String },
  communityResidenceType: { required: false, type: String },
  complex: { required: false, type: Object },
  createdAt: { default: Date.now, required: true, type: Date },
  createdBy: { required: false, type: String },
  emailAddress: { required: true, type: String, unique: true },
  gatedCommunity: { required: false, type: Object },
  houseNumber: { required: false, type: String },
  idNumber: { required: false, type: String },
  name: { required: true, type: String },
  residenceType: { required: true, type: String },
  securityCompany: { required: false, type: Object },
  surname: { required: true, type: String },
  unitNumber: { required: false, type: String },
  userId: { default: null, ref: "User", required: false, type: mongoose.Schema.Types.ObjectId },
  vehicles: {
    default: [],
    required: false,
    type: [
      {
        color: { required: false, type: String },
        make: { required: true, type: String },
        model: { required: true, type: String },
        reg: { required: true, type: String },
      },
    ],
  },
});

const residentSchema = mongoose.model("Resident", resident);

export default residentSchema;