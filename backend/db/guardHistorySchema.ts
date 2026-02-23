import mongoose from "mongoose";

const guardHistory = new mongoose.Schema({
  guardOnShift: {
    emailAddress: { required: true, type: String },
    name: { required: true, type: String },
    userId: { ref: "User", required: true, type: mongoose.Schema.Types.ObjectId },
  },
  startShift: { default: Date.now, required: true, type: Date },
  station: {
    complexId: { required: false, type: mongoose.Schema.Types.ObjectId },
    gatedCommunityId: { required: false, type: mongoose.Schema.Types.ObjectId },
    name: { required: true, type: String },
    type: { enum: ["gated", "complex"], required: true, type: String },
  },
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
  toJSON: {
    transform: (_doc, ret) => {
      if ("updatedAt" in ret) {
        delete (ret as Record<string, unknown>).updatedAt;
      }
      return ret;
    },
  },
  toObject: {
    transform: (_doc, ret) => {
      if ("updatedAt" in ret) {
        delete (ret as Record<string, unknown>).updatedAt;
      }
      return ret;
    },
  },
});

const guardHistorySchema = mongoose.model("GuardHistory", guardHistory, "GuardHistory");

export default guardHistorySchema;
