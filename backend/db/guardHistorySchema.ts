import mongoose from "mongoose";

const guardHistory = new mongoose.Schema({
  startShift: { type: Date, required: true, default: Date.now },
  guardOnShift: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    name: { type: String, required: true },
    emailAddress: { type: String, required: true },
  },
  station: {
    type: { type: String, required: true, enum: ["gated", "complex"] },
    gatedCommunityId: { type: mongoose.Schema.Types.ObjectId, required: false },
    complexId: { type: mongoose.Schema.Types.ObjectId, required: false },
    name: { type: String, required: true },
  },
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.updatedAt;
      return ret;
    },
  },
  toObject: {
    transform: (_doc, ret) => {
      delete ret.updatedAt;
      return ret;
    },
  },
});

const guardHistorySchema = mongoose.model("GuardHistory", guardHistory, "GuardHistory");

export default guardHistorySchema;
