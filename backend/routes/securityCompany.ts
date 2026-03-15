import securityCompanySchema from "#db/securityCompanySchema.js";
import userSchema from "#db/userSchema.js";
import { securityCompanyBodyValidation, SecurityCompanyDTO } from "#interfaces/securityCompanyDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { sendSecurityCompanyCode } from "#utils/sendEmail.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import bcrypt from "bcryptjs";
import { Request, Response, Router } from "express";

const securityCompanyRouter = Router();

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

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

const getDuplicateDebugDetails = (error: unknown): null | {
  duplicateKeyPattern: Record<string, number>;
  duplicateKeyValue: Record<string, unknown>;
} => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const mongoError = error as {
    code?: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, unknown>;
  };

  if (mongoError.code !== 11000) {
    return null;
  }

  return {
    duplicateKeyPattern: mongoError.keyPattern ?? {},
    duplicateKeyValue: mongoError.keyValue ?? {},
  };
};

const getDuplicateKeyPattern = (error: unknown): null | Record<string, number> => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const mongoError = error as { code?: number; keyPattern?: Record<string, number> };
  if (mongoError.code !== 11000) {
    return null;
  }

  return mongoError.keyPattern ?? null;
};

const isDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const mongoError = error as { code?: number };
  return mongoError.code === 11000;
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

securityCompanyRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const securityCompany = await securityCompanySchema.findById(ValidObjectId(id)).exec();

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
  const normalizedCipc = normalizeOptionalString(securityCompany.cipcRegistrationNumber);
  const normalizedPsira = normalizeOptionalString(securityCompany.psiraNumber);

  if (normalizedCipc === undefined) {
    delete securityCompany.cipcRegistrationNumber;
  } else {
    securityCompany.cipcRegistrationNumber = normalizedCipc;
  }

  if (normalizedPsira === undefined) {
    delete securityCompany.psiraNumber;
  } else {
    securityCompany.psiraNumber = normalizedPsira;
  }

  try {
    console.log("[securityCompany] create request", {
      contactNumber: securityCompany.contactNumber,
      email: securityCompany.email,
      name: securityCompany.name,
    });
    let newSecurityCompany = new securityCompanySchema(securityCompany);

    try {
      await newSecurityCompany.save();
    } catch (error) {
      const duplicateKeyPattern = getDuplicateKeyPattern(error);

      if (duplicateKeyPattern?.cipcRegistrationNumber) {
        delete securityCompany.cipcRegistrationNumber;
        newSecurityCompany = new securityCompanySchema(securityCompany);
        await newSecurityCompany.save();
      } else {
        throw error;
      }
    }

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

    let managerLinked = false;
    let managerLinkWarning: null | string = null;

    try {
      await managerProfile.save();
      console.log("[securityCompany] manager user saved", { id: managerProfile._id });
      newSecurityCompany.managerEmail = managerEmail;
      newSecurityCompany.managerUserId = managerProfile._id;
      await newSecurityCompany.save();
      console.log("[securityCompany] manager linked", { companyId: newSecurityCompany._id });
      managerLinked = true;
    } catch (error) {
      console.error("[securityCompany] create failed", error);

      if (isDuplicateKeyError(error)) {
        managerLinkWarning =
          "Security company added, but manager profile could not be created because the email already exists.";
      } else {
        await securityCompanySchema.findByIdAndDelete(newSecurityCompany._id);
        await userSchema.findOneAndDelete({ emailAddress: managerEmail });
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: errorMessage, message: "Unable to create manager profile." });
        return;
      }
    }

    let emailSent = false;
    let emailError: null | string = null;

    if (managerLinked) {
      try {
        await sendSecurityCompanyCode({
          code,
          companyName: securityCompany.name,
          to: managerEmail,
        });
        emailSent = true;
        console.log("[securityCompany] email sent", { to: managerEmail });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        emailError = errorMessage;
        console.error("[securityCompany] manager email failed", {
          error: errorMessage,
          to: managerEmail,
        });
      }
    } else {
      emailError = managerLinkWarning;
      console.log("[securityCompany] email skipped", {
        reason: managerLinkWarning,
        to: managerEmail,
      });
    }

    if (!emailSent) {
      res.status(201).json({
        emailError,
        emailSent: false,
        message:
          managerLinkWarning ??
          "Security company added, but manager email was not sent because profile creation/linking did not complete.",
        payload: newSecurityCompany,
      });
      return;
    }

    res.status(201).json({
      emailSent: true,
      message: "Security company successfully added and manager credentials sent.",
      payload: newSecurityCompany,
    });
    return;
  } catch (error) {
    console.error("[securityCompany] create unexpected error", error);
    const duplicateMessage = getDuplicateFieldMessage(error);
    if (duplicateMessage) {
      const debugDetails = getDuplicateDebugDetails(error);
      console.error("[securityCompany] duplicate conflict", {
        ...debugDetails,
        message: duplicateMessage,
      });
      res.status(409).json({
        debug: debugDetails,
        message: duplicateMessage,
      });
      return;
    }
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;

  const updates = { ...(req.body as Record<string, unknown>) };
  const unsetFields: Record<string, 1> = {};

  if ("cipcRegistrationNumber" in updates) {
    const normalizedCipc = normalizeOptionalString(updates.cipcRegistrationNumber);
    if (normalizedCipc === undefined) {
      delete updates.cipcRegistrationNumber;
      unsetFields.cipcRegistrationNumber = 1;
    } else {
      updates.cipcRegistrationNumber = normalizedCipc;
    }
  }

  if ("psiraNumber" in updates) {
    const normalizedPsira = normalizeOptionalString(updates.psiraNumber);
    if (normalizedPsira === undefined) {
      delete updates.psiraNumber;
      unsetFields.psiraNumber = 1;
    } else {
      updates.psiraNumber = normalizedPsira;
    }
  }

  const securityCompanyQuery: {
    $set?: Record<string, unknown>;
    $unset?: Record<string, 1>;
  } = {};

  if (Object.keys(updates).length > 0) {
    securityCompanyQuery.$set = updates;
  }

  if (Object.keys(unsetFields).length > 0) {
    securityCompanyQuery.$unset = unsetFields;
  }

  if (Object.keys(securityCompanyQuery).length === 0) {
    res.status(400).json({ message: "Bad Request! No valid fields provided." });
    return;
  }

  try {
    const updatedSecurityCompany = await securityCompanySchema.findByIdAndUpdate(ValidObjectId(id), securityCompanyQuery, { new: true }).exec();

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

securityCompanyRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existingCompany = await securityCompanySchema.findById(ValidObjectId(id)).exec();
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
