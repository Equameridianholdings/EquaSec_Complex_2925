import gatedCommunitySchema from "#db/gatedCommunity.js";
import { gatedCommunityBodyValidation, gatedCommunityDTO } from "#interfaces/gatedCommunityDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Request, Response, Router } from "express";
import { checkSchema } from "express-validator/lib/middlewares/schema.js";
import { ObjectId } from "mongoose";

const gatedCommunityRouter = Router();

gatedCommunityRouter.use(AuthMiddleware);

gatedCommunityRouter.post("/", checkSchema(gatedCommunityBodyValidation), validateSchema, async (req: Request, res: Response) => {
  try {
    const gatedCommunity = req.body as gatedCommunityDTO;
    const gatedCommunityQuery = {
      name: gatedCommunity.name,
    };
    const gatedCommunities = await gatedCommunitySchema.findOne(gatedCommunityQuery);
    
    if (gatedCommunities !== null) {
      res.status(400).json({ message: "Bad Request! Gated Community already exists!" });
      return;
    }

    const newGatedCommunity = new gatedCommunitySchema(req.body);
    await newGatedCommunity.save();

    res.status(201).json({ message: "Gated Community added successfully!", payload: newGatedCommunity });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error!" });
    return;
  }
});

gatedCommunityRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const gatedCommunity = await gatedCommunitySchema.findById(_id);

    if (gatedCommunity === null) {
      res.status(404).json({ message: "Gated Community not found!" });
      return;
    }

    res.status(200).json(gatedCommunity);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.get("/", async (req, res) => {
  try {
    const gatedCommunities = await gatedCommunitySchema.find({});

    if (gatedCommunities.length === 0) {
      res.status(404).json({ message: "No Gated Communities found!" });
      return;
    }

    res.status(200).json(gatedCommunities);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.patch("/:id", validateObjectId, async (req, res) => {
  const gatedCommunityQuery = {
    $set: req.body as object,
  };
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request." });

  const _id = req.params.id as ObjectId;

  try {
    const updatedGatedCommunity = await gatedCommunitySchema.findOneAndUpdate(_id, gatedCommunityQuery, { new: true });

    if (updatedGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    res.status(200).json({ message: "Gated Community successfully updated!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

gatedCommunityRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const deletedGatedCommunity = await gatedCommunitySchema.findByIdAndDelete(_id);

    if (deletedGatedCommunity === null) {
      res.status(404).json({ message: "Gated Community does not exist!" });
      return;
    }

    res.status(200).json({ message: "Gated Community successfully deleted!" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default gatedCommunityRouter;