import sosSchema from "#db/sosSchema.js";
import { sosBodyValidation, SOSDTO } from "#interfaces/sosDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Request, Response, Router } from "express";
import { ObjectId } from "mongodb";

const sosRouter = Router();

const getRequestIdParam = (req: Request): string => {
  const id = req.params.id;
  if (Array.isArray(id)) {
    return id[0] || "";
  }
  return id;
};

sosRouter.use(AuthMiddleware);

sosRouter.get("/", async (req: Request, res: Response) => {
  try {
    const SOS = await sosSchema.find({}).select({}).exec();
    res.status(200).json(SOS);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

sosRouter.get("/:id", validateObjectId, async (req: Request, res: Response) => {
  const id = getRequestIdParam(req);

  const sosQuery = {
    "gaurd.securityCompany": new ObjectId(id),
  };
  try {
    const sos = await sosSchema.find(sosQuery).select({}).exec();

    if (sos.length === 0) {
      res.status(404).json({ message: "No sos's found!" });
      return;
    }

    res.status(200).json(sos);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

sosRouter.post("/", sosBodyValidation, validateSchema, async (req: Request, res: Response) => {
  const requestBody = req.body as Partial<SOSDTO>;
  const guard = requestBody.guard;
  const station = requestBody.station;

  console.log("[SOS][POST] incoming request", {
    date: requestBody.date,
    guardId: guard?._id,
    guardName: `${guard?.name ?? ""} ${guard?.surname ?? ""}`.trim(),
    hasBody: Boolean(requestBody),
    stationAddress: station?.complexAddress,
    stationName: station?.name,
    stationType: station?.type,
  });

  const sos = req.body as SOSDTO;
  try {
    const newSOS = new sosSchema(sos);
    await newSOS.save();
    console.log("[SOS][POST] saved to database", {
      date: newSOS.date,
      sosId: String(newSOS._id),
    });

    const delivery: [] = [];
    console.log("[SOS][POST] notifications disabled; skipping WhatsApp and voice delivery");

    res.status(201).json({
      message: "SOS successfully called!",
      payload: {
        delivery,
        sos: newSOS,
      },
    });
    return;
  } catch (error) {
    console.error("[SOS][POST] failed", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

sosRouter.delete("/:id", validateObjectId, async (req: Request, res: Response) => {
  const id = getRequestIdParam(req);

  try {
    const deletedSOS = await sosSchema.findByIdAndDelete(new ObjectId(id)).exec();

    if (deletedSOS === null) {
      res.status(404).json({ message: "SOS does not exist!" });
      return;
    }

    res.status(200).json({ message: "SOS successfully deleted!", payload: deletedSOS });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default sosRouter;
