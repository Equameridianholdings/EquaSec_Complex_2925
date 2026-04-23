import mongoose from "mongoose";

const registrationToken = new mongoose.Schema({
  address: { required: true, type: String },
  communityComplexId: { required: false, type: String },
  communityId: { required: false, type: String },
  communityResidenceType: { required: false, type: String },
  complexId: { required: false, type: String },
  createdAt: { default: Date.now, required: true, type: Date },
  createdBy: { required: true, type: String },
  emailAddress: { required: true, type: String },
  expiresAt: { required: true, type: Date },
  houseNumber: { required: false, type: String },
  residenceType: { required: true, type: String },
  token: { required: true, type: String, unique: true },
  unitNumber: { required: false, type: String },
  used: { default: false, required: true, type: Boolean },
  usedAt: { required: false, type: Date },
});

// Index to automatically delete expired tokens after 7 days of expiration
registrationToken.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });

const registrationTokenSchema = mongoose.model("RegistrationToken", registrationToken);

export default registrationTokenSchema;
