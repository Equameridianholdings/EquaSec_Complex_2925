import sosSchema from "#db/sosSchema.js";
import { sosBodyValidation, SOSDTO } from "#interfaces/sosDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { sendSosAlerts } from "#utils/sendSosNotification.js";
import validateObjectId from "#utils/validateObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { validationResult } from "express-validator";

const sosRouter = Router();

sosRouter.use(AuthMiddleware);

sosRouter.get("/", async (req, res) => {
  try {
    const SOS = await sosSchema.find({});

    if (SOS.length === 0) {
      res.status(404).json({ message: "No sos's found!" });
      return;
    }

    res.status(200).json(SOS);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

sosRouter.get("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  const sosQuery = {
    "gaurd.securityCompany": _id,
  };
  try {
    const sos = await sosSchema.find(sosQuery);

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

sosRouter.post("/", async (req, res) => {
  console.log("[SOS][POST] incoming request", {
    hasBody: Boolean(req.body),
    date: req.body?.date,
    guardId: req.body?.guard?._id,
    guardName: `${req.body?.guard?.name ?? ""} ${req.body?.guard?.surname ?? ""}`.trim(),
    stationType: req.body?.station?.type,
    stationName: req.body?.station?.name,
    stationAddress: req.body?.station?.complexAddress,
  });

  await sosBodyValidation.run(req);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("[SOS][POST] validation failed", errors.array());
    return res.status(400).json({ message: "Invalid details", payload: errors.array() });
  }

  const sos = req.body as SOSDTO;
  try {
    const newSOS = new sosSchema(sos);
    await newSOS.save();
    console.log("[SOS][POST] saved to database", {
      sosId: String(newSOS._id ?? ""),
      date: newSOS.date,
    });

    const delivery = await sendSosAlerts({
      date: new Date(sos.date),
      guard: {
        _id: sos.guard?._id,
        name: sos.guard?.name,
        surname: sos.guard?.surname,
        emailAddress: sos.guard?.emailAddress,
        cellNumber: sos.guard?.cellNumber,
      },
      station: {
        type: sos.station?.type,
        name: sos.station?.name,
        complexName: sos.station?.complexName,
        complexAddress: sos.station?.complexAddress,
        gatedCommunityName: sos.station?.gatedCommunityName,
      },
    });

    console.log("[SOS][POST] delivery results", delivery);

    res.status(201).json({
      message: "SOS successfully called!",
      payload: {
        sos: newSOS,
        delivery,
      },
    });
    return;
  } catch (error) {
    console.error("[SOS][POST] failed", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

sosRouter.delete("/:id", validateObjectId, async (req, res) => {
  if (!req.params) return res.status(400).json({ message: "Bad Request! Invalid request."});

  const _id = req.params.id as ObjectId;

  try {
    const deletedSOS = await sosSchema.findByIdAndDelete(new ObjectId(_id));

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