import emergencyContactSchema from "#db/emergencyContactSchema.js";
import { emergencyContactBodyValidation, emergencyContactDTO } from "#interfaces/emergencyContactDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Router } from "express";

const emergencyContactRouter = Router();

emergencyContactRouter.use(AuthMiddleware);

emergencyContactRouter.get("/", async (req, res) => {
  try {
    const emergencyContacts = await emergencyContactSchema.find({}).exec();

    if (emergencyContacts.length === 0) {
      res.status(404).json({ message: "No emergency contacts not found!" });
      return;
    }

    res.status(200).json(emergencyContacts);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

emergencyContactRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const emergencyContactQuery = {
      "securityCompany._id": ValidObjectId(id),
    };
    const emergencyContacts = await emergencyContactSchema.find(emergencyContactQuery).exec();

    if (emergencyContacts.length === 0) {
      res.status(404).json({ message: "Emergency contacts not found!" });
      return;
    }

    res.status(200).json(emergencyContacts);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

emergencyContactRouter.post("/", async (req, res) => {
  const validated = await emergencyContactBodyValidation.run(req);

  if (validated.length > 0) return res.status(400).json({ message: "Invalid details", payload: validated });

  const emergencyContact = req.body as emergencyContactDTO;

  try {
    const newEmergencyContact = new emergencyContactSchema(emergencyContact);
    await newEmergencyContact.save();

    res.status(201).json({ message: "Emergency contact added!", payload: newEmergencyContact });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

emergencyContactRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const emergencyContactQuery = {
      $set: req.body as object,
    };
    const updatedEmergencyContact = await emergencyContactSchema.findByIdAndUpdate(ValidObjectId(id), emergencyContactQuery, { new: true }).exec();

    if (updatedEmergencyContact === null) {
      res.status(404).json({ message: "Emergency contact not found!" });
      return;
    }

    res.status(200).json({ message: "Emergency contact successfully updated!", payload: updatedEmergencyContact });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

emergencyContactRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedEmergencyContact = await emergencyContactSchema.findByIdAndDelete(ValidObjectId(id)).exec();

    if (deletedEmergencyContact === null) {
      res.status(404).json({ message: "Emergency contact not found!" });
      return;
    }

    res.status(200).json({ message: "Emergency contact successfully deleted!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default emergencyContactRouter;
