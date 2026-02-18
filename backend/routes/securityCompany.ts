import securityCompanySchema from "#db/securityCompanySchema.js";
import { securityCompanyBodyValidation, SecurityCompanyDTO } from "#interfaces/securityCompanyDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const securityCompanyRouter = Router();

securityCompanyRouter.use(AuthMiddleware);

securityCompanyRouter.get("/", async (req, res) => {
  try {
    const securityCompanys = await securityCompanySchema.find({});

    if (securityCompanys.length === 0) {
      res.status(404).json({ message: "No Security Companies found!" });
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
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const securityCompany = await securityCompanySchema.findById(_id);

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

securityCompanyRouter.post("/", async (req, res) => {
  const validated = await securityCompanyBodyValidation.run(req);

  if (validated.length > 0) return res.status(400).json({ message: "Invalid details", payload: validated });
  
  const securityCompany = req.body as SecurityCompanyDTO;
  try {
    const newSecurityCompany = new securityCompanySchema(securityCompany);
    await newSecurityCompany.save();

    res.status(201).json({ message: "Security company successfully added!", payload: newSecurityCompany });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

securityCompanyRouter.patch("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  const securityCompanyQuery = {
    $set: req.body as object,
  };
  try {
    const updatedSecurityCompany = await securityCompanySchema.findByIdAndUpdate(_id, securityCompanyQuery, { new: true });

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
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const deletedSecurityCompany = await securityCompanySchema.findByIdAndDelete(new ObjectId(_id));

    if (deletedSecurityCompany === null) {
      res.status(404).json({ message: "Security company does not exist!" });
      return;
    }

    res.status(200).json({ message: "Security company successfully deleted", payload: deletedSecurityCompany });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default securityCompanyRouter;
