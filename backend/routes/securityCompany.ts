import securityCompanySchema from "#db/securityCompanySchema.js";
import userSchema from "#db/userSchema.js";
import { securityCompanyBodyValidation, SecurityCompanyDTO } from "#interfaces/securityCompanyDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { sendSecurityCompanyCode } from "#utils/sendEmail.js";
import validateObjectId from "#utils/validateObjectId.js";
import bcrypt from "bcryptjs";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";

const securityCompanyRouter = Router();

const getDuplicateFieldMessage = (error: unknown): null | string => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const mongoError = error as { code?: number; keyPattern?: Record<string, number> };
  if (mongoError.code !== 11000) {
    return null;
  }

  if (mongoError.keyPattern?.cipcRegistrationNumber) {
    return "Security company with this CIPC registration number already exists.";
  }

  if (mongoError.keyPattern?.email) {
    return "Security company with this email already exists.";
  }

  if (mongoError.keyPattern?.emailAddress) {
    return "Manager user with this email already exists.";
  }

  return "Duplicate value already exists.";
};

securityCompanyRouter.use(AuthMiddleware);

securityCompanyRouter.get("/", async (req, res) => {
  try {
    const securityCompanys = await securityCompanySchema.find({}).select({}).exec();

    if (securityCompanys.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(securityCompanys);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const securityCompany = await securityCompanySchema.findById(_id).exec();

    if (securityCompany === null) {
      res.status(404).json({ message: "Security Company not found!" });
      return;
    }

    res.status(200).json(securityCompany);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.post("/", securityCompanyBodyValidation, validateSchema, async (req: Request, res: Response) => {
  const securityCompany = req.body as SecurityCompanyDTO;
  try {
    console.log("[securityCompany] create request", {
      contactNumber: securityCompany.contactNumber,
      email: securityCompany.email,
      name: securityCompany.name,
    });
    const newSecurityCompany = new securityCompanySchema(securityCompany);
    await newSecurityCompany.save();
    console.log("[securityCompany] saved", { id: newSecurityCompany._id });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const managerEmail = securityCompany.email;
    console.log("[securityCompany] manager", { code, email: managerEmail });
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(code, salt);
    const managerProfile = new userSchema({
      cellNumber: "0000000000",
      complex: null,
      emailAddress: managerEmail,
      movedOut: false,
      name: securityCompany.name,
      password: hashedCode,
      profilePhoto: "",
      salt,
      securityCompany: {
        _id: newSecurityCompany._id,
        name: newSecurityCompany.name,
      },
      surname: "Manager",
      type: ["manager"],
    });
    try {
      await managerProfile.save();
      console.log("[securityCompany] manager user saved", { id: managerProfile._id });
      newSecurityCompany.managerEmail = managerEmail;
      newSecurityCompany.managerUserId = managerProfile._id;
      await newSecurityCompany.save();
      console.log("[securityCompany] manager linked", { companyId: newSecurityCompany._id });

      await sendSecurityCompanyCode({
        code,
        companyName: securityCompany.name,
        to: managerEmail,
      });
      console.log("[securityCompany] email sent", { to: managerEmail });
    } catch (error) {
      console.error("[securityCompany] create failed", error);
      await securityCompanySchema.findByIdAndDelete(newSecurityCompany._id);
      await userSchema.findOneAndDelete({ emailAddress: managerEmail });
      const duplicateMessage = getDuplicateFieldMessage(error);
      if (duplicateMessage) {
        res.status(409).json({ message: duplicateMessage });
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage, message: "Unable to create manager profile or send email." });
      return;
    }

    res.status(201).json({ emailSent: true, message: "Security company successfully added!", payload: newSecurityCompany });
    return;
  } catch (error) {
    console.error("[securityCompany] create unexpected error", error);
    const duplicateMessage = getDuplicateFieldMessage(error);
    if (duplicateMessage) {
      res.status(409).json({ message: duplicateMessage });
      return;
    }
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.patch("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  const securityCompanyQuery = {
    $set: req.body as object,
  };
  try {
    const updatedSecurityCompany = await securityCompanySchema.findByIdAndUpdate(_id, securityCompanyQuery, { new: true }).exec();

    if (updatedSecurityCompany === null) {
      res.status(404).json({ message: "Security company does not exist!" });
      return;
    }

    res.status(200).json({ message: "Security company successfully updated!", payload: updatedSecurityCompany });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const existingCompany = await securityCompanySchema.findById(_id).exec();
    if (existingCompany === null) {
      res.status(404).json({ message: "Security company does not exist!" });
      return;
    }

    await securityCompanySchema.deleteOne({ _id: existingCompany._id });

    await userSchema.updateMany({ "securityCompany._id": existingCompany._id }, { $set: { securityCompany: null } });

    if (existingCompany.managerUserId) {
      await userSchema.findByIdAndDelete(existingCompany.managerUserId).exec();
    }

    res.status(200).json({ message: "Security company successfully deleted", payload: existingCompany });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default securityCompanyRouter;
