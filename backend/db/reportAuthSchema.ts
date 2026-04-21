import mongoose from "mongoose";

const reportAuth = new mongoose.Schema(
  {
    createdAt: { default: () => new Date(), required: true, type: Date },
    guardEmail: { required: true, type: String },
    guardName: { required: true, type: String },
    pdfBase64: { required: true, type: String },
    recipientEmail: { required: true, type: String },
    recipientName: { required: true, type: String },
    recipientSurname: { required: true, type: String },
    securityCompanyId: { required: true, type: String },
    securityCompanyManagerEmail: { required: true, type: String },
    securityCompanyName: { required: false, type: String },
    status: { default: "pending", enum: ["pending", "rejected", "sent"], required: true, type: String },
  },
  { collection: "reportAuthorisations" },
);

const reportAuthSchema = mongoose.model("ReportAuthorisation", reportAuth);

export default reportAuthSchema;
