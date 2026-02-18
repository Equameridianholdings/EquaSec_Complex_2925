import complexSchema from "#db/complexSchema.js";
import { complexBodyValidation } from "#interfaces/complexDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";

const complexRouter = Router();

complexRouter.use(AuthMiddleware);

complexRouter.post("/:complex", async (req, res) => {
  const validated = await complexBodyValidation.run(req);

  if (validated.length > 0) return res.status(400).json({ message: "Invalid details", payload: validated });

  const complexName = req.params.complex;

  try {
    const complexQuery = {
      name: complexName,
    };
    const complexes = await complexSchema.findOne(complexQuery);

    if (complexes === null) {
      res.status(400).json({ message: "Bad Request! Complex already exists!" });
      return;
    }

    const complex = new complexSchema(req.body);
    await complex.save();

    res.status(201).json({ message: "Complex added successfully!", payload: complex });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

complexRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const complex = await complexSchema.findById(_id);

    if (complex === null) {
      res.status(404).json({ message: "Complex not found!" });
      return;
    }

    res.status(200).json(complex);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.get("/", async (req, res) => {
  try {
    const complexes = await complexSchema.find({});

    if (complexes.length === 0) {
      res.status(404).json({ message: "No complexes found!" });
      return;
    }

    res.status(200).json(complexes);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.patch("/:id", validateObjectId, async (req, res) => {
  const complexQuery = {
    $set: req.body as object,
  };
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const updatedComplex = await complexSchema.findOneAndUpdate(_id, complexQuery, { new: true });

    if (updatedComplex === null) {
      res.status(404).json({ message: "Complex does not exist!" });
      return;
    }

    res.status(200).json({ message: "Complex successfully updated!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

complexRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const deletedComplex = await complexSchema.findByIdAndDelete(new ObjectId(_id));

    if (deletedComplex === null) {
      res.status(404).json({ message: "Complex does not exist!" });
      return;
    }

    res.status(200).json({ message: "Complex successfully deleted!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default complexRouter;
