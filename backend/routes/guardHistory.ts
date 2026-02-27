import guardHistorySchema from "#db/guardHistorySchema.js";
import userSchema from "#db/userSchema.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { validateSchema } from "#middleware/validateSchema.middleware.js";
import { Router } from "express";
import { Request, Response } from "express";
import { checkSchema, Schema } from "express-validator/lib/middlewares/schema.js";
import { body } from "express-validator/lib/middlewares/validation-chain-builders.js";
import { ObjectId } from "mongodb";

const guardHistoryRouter = Router();
const SHIFT_WINDOW_HOURS = 12;
const CAPE_TOWN_TIME_ZONE = "Africa/Johannesburg";

interface ShiftStationRequestBody {
  selectedComplex?: string;
  selectedGatedCommunity?: string;
  stationName?: string;
  stationType?: "complex" | "gated";
}

const getCapeTownNow = (): Date => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: CAPE_TOWN_TIME_ZONE,
    year: "numeric",
  });

  const capeTownDateTime = formatter.format(now).replace(" ", "T");
  return new Date(`${capeTownDateTime}+02:00`);
};

const toObjectIdString = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const withOid = value as { $oid?: unknown; _id?: unknown; toHexString?: () => string; toString?: () => string };

    if (typeof withOid.toHexString === "function") {
      return withOid.toHexString();
    }

    if (withOid.$oid) {
      return toObjectIdString(withOid.$oid);
    }

    if (withOid._id) {
      return toObjectIdString(withOid._id);
    }

    if (typeof withOid.toString === "function") {
      const asString = withOid.toString();
      if (asString && asString !== "[object Object]") {
        return asString;
      }
    }
  }

  return "";
};

guardHistoryRouter.use(AuthMiddleware);

const startShiftValidation: Schema = {
  stationName: {
    errorMessage: "Station name is required",
    isEmpty: false,
  },
  stationType: {
    errorMessage: "Invalid station type",
    isIn: {
      options: [["gated", "complex"]],
    },
  },
};

const getEffectiveCutoffDate = (): Date => {
  const now = getCapeTownNow();
  return new Date(now.getTime() - SHIFT_WINDOW_HOURS * 60 * 60 * 1000);
};

guardHistoryRouter.post(
  "/start",
  body("selectedGatedCommunity").optional({ nullable: true }).isString(),
  body("selectedComplex").optional({ nullable: true }).isString(),
  checkSchema(startShiftValidation),
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as Request & { userEmail?: string };
      const emailAddress = authReq.userEmail;

      if (!emailAddress) {
        return res.status(401).json({ message: "Access Denied!" });
      }

      const user = await userSchema.findOne({ emailAddress });
      if (!user) {
        return res.status(404).json({ message: "Guard not found" });
      }

      const requestBody = req.body as ShiftStationRequestBody;

      console.log("[GuardHistory][start] request", {
        emailAddress,
        selectedComplex: requestBody.selectedComplex,
        selectedGatedCommunity: requestBody.selectedGatedCommunity,
        stationName: requestBody.stationName,
        stationType: requestBody.stationType,
        userId: toObjectIdString(user._id),
      });

      const stationType = requestBody.stationType ?? "";
      const stationName = (requestBody.stationName ?? "").trim();
      const selectedGatedCommunity = (requestBody.selectedGatedCommunity ?? "").trim();
      const selectedComplex = (requestBody.selectedComplex ?? "").trim();

      if (!stationName) {
        return res.status(400).json({ message: "Station name is required" });
      }

      if (stationType === "gated" && !selectedGatedCommunity) {
        return res.status(400).json({ message: "Gated community is required for gated station" });
      }

      if (stationType === "complex" && !selectedComplex) {
        return res.status(400).json({ message: "Complex is required for complex station" });
      }

      const effectiveCutoff = getEffectiveCutoffDate();
      const existingActiveShift = await guardHistorySchema
        .findOne({
          $or: [{ "guardOnShift.userId": user._id }, { "guardOnShift.emailAddress": emailAddress }],
          startShift: { $gte: effectiveCutoff },
        })
        .sort({ startShift: -1 });

      if (existingActiveShift) {
        existingActiveShift.station = {
          complexId: ObjectId.isValid(selectedComplex) ? new ObjectId(selectedComplex) : undefined,
          gatedCommunityId: ObjectId.isValid(selectedGatedCommunity) ? new ObjectId(selectedGatedCommunity) : undefined,
          name: stationName,
          type: stationType,
        };

        const updatedShift = await existingActiveShift.save();

        console.log("[GuardHistory][start] reusedActiveShift", {
          shiftId: toObjectIdString(updatedShift._id),
          startShift: updatedShift.startShift,
          station: updatedShift.station,
        });

        return res.status(200).json({
          message: "Active shift reused and station updated",
          payload: updatedShift,
        });
      }

      const payload = {
        guardOnShift: {
          emailAddress: user.emailAddress,
          name: `${user.name} ${user.surname}`.trim(),
          userId: user._id,
        },
        startShift: getCapeTownNow(),
        station: {
          complexId: ObjectId.isValid(selectedComplex) ? new ObjectId(selectedComplex) : undefined,
          gatedCommunityId: ObjectId.isValid(selectedGatedCommunity) ? new ObjectId(selectedGatedCommunity) : undefined,
          name: stationName,
          type: stationType,
        },
      };

      const guardHistory = await guardHistorySchema.create(payload);

      console.log("[GuardHistory][start] created", {
        shiftId: toObjectIdString(guardHistory._id),
        startShift: guardHistory.startShift,
        station: guardHistory.station,
      });

      return res.status(201).json({
        message: "Guard shift history saved",
        payload: guardHistory,
      });
    } catch (error) {
      console.error("[GuardHistory][start] error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

guardHistoryRouter.get("/mine", async (req: Request, res: Response) => {
  try {
    const authReq = req as Request & { userEmail?: string };
    const emailAddress = authReq.userEmail;

    if (!emailAddress) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    const user = await userSchema.findOne({ emailAddress }).select({ _id: 1 });
    if (!user) {
      return res.status(404).json({ message: "Guard not found" });
    }

    const history = await guardHistorySchema
      .find({ "guardOnShift.userId": user._id })
      .select("-updatedAt")
      .sort({ startShift: -1 })
      .limit(100)
      .lean();

    return res.status(200).json(history);
  } catch {
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

guardHistoryRouter.patch(
  "/active/station",
  body("selectedGatedCommunity").optional({ nullable: true }).isString(),
  body("selectedComplex").optional({ nullable: true }).isString(),
  checkSchema(startShiftValidation),
  validateSchema,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as Request & { userEmail?: string };
      const emailAddress = authReq.userEmail;

      if (!emailAddress) {
        return res.status(401).json({ message: "Access Denied!" });
      }

      const user = await userSchema.findOne({ emailAddress }).select({ _id: 1 });
      if (!user) {
        return res.status(404).json({ message: "Guard not found" });
      }

      const requestBody = req.body as ShiftStationRequestBody;

      console.log("[GuardHistory][active/station] request", {
        emailAddress,
        selectedComplex: requestBody.selectedComplex,
        selectedGatedCommunity: requestBody.selectedGatedCommunity,
        stationName: requestBody.stationName,
        stationType: requestBody.stationType,
        userId: toObjectIdString(user._id),
      });

      const stationType = requestBody.stationType ?? "";
      const stationName = (requestBody.stationName ?? "").trim();
      const selectedGatedCommunity = (requestBody.selectedGatedCommunity ?? "").trim();
      const selectedComplex = (requestBody.selectedComplex ?? "").trim();

      if (!stationName) {
        return res.status(400).json({ message: "Station name is required" });
      }

      if (stationType === "gated" && !selectedGatedCommunity) {
        return res.status(400).json({ message: "Gated community is required for gated station" });
      }

      if (stationType === "complex" && !selectedComplex) {
        return res.status(400).json({ message: "Complex is required for complex station" });
      }

      const effectiveCutoff = getEffectiveCutoffDate();

      const activeShift = await guardHistorySchema
        .findOne({
          $or: [{ "guardOnShift.userId": user._id }, { "guardOnShift.emailAddress": emailAddress }],
          startShift: { $gte: effectiveCutoff },
        })
        .sort({ startShift: -1 });

      console.log("[GuardHistory][active/station] activeShiftLookup", {
        effectiveCutoff,
        foundShiftId: String(activeShift?._id ?? ""),
        foundShiftStart: activeShift?.startShift,
      });

      if (!activeShift) {
        return res.status(404).json({ message: "No active shift found to update" });
      }

      activeShift.station = {
        complexId: ObjectId.isValid(selectedComplex) ? new ObjectId(selectedComplex) : undefined,
        gatedCommunityId: ObjectId.isValid(selectedGatedCommunity) ? new ObjectId(selectedGatedCommunity) : undefined,
        name: stationName,
        type: stationType,
      };

      const updatedShift = await activeShift.save();

      console.log("[GuardHistory][active/station] updated", {
        shiftId: toObjectIdString(updatedShift._id),
        station: updatedShift.station,
      });

      return res.status(200).json({
        message: "Active shift station updated",
        payload: updatedShift,
      });
    } catch (error) {
      console.error("[GuardHistory][active/station] error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },
);

guardHistoryRouter.get("/active", async (req: Request, res: Response) => {
  try {
    const emailAddress = res.get('email');

    if (!emailAddress) {
      return res.status(401).json({ message: "Access Denied!" });
    }

    const user = await userSchema.findOne({ emailAddress }).select({ _id: 1 });
    if (!user) {
      return res.status(404).json({ message: "Guard not found" });
    }

    const effectiveCutoff = getEffectiveCutoffDate();

    console.log("[GuardHistory][active] lookup", {
      effectiveCutoff,
      emailAddress,
      userId: toObjectIdString(user._id),
    });

    const activeShift = await guardHistorySchema
      .findOne({
        $or: [{ "guardOnShift.userId": user._id }, { "guardOnShift.emailAddress": emailAddress }],
        startShift: { $gte: effectiveCutoff },
      })
      .select("-updatedAt")
      .sort({ startShift: -1 })
      .lean();

    console.log("[GuardHistory][active] result", {
      foundShiftId: String(activeShift?._id ?? ""),
      foundShiftStart: activeShift?.startShift,
      station: activeShift?.station,
    });

    if (!activeShift) {
      return res.status(200).json({ payload: null });
    }

    return res.status(200).json({
      payload: {
        ...activeShift,
        station: {
          ...activeShift.station,
          complexId: toObjectIdString(activeShift.station?.complexId),
          gatedCommunityId: toObjectIdString(activeShift.station?.gatedCommunityId),
        },
      },
    });
  } catch (error) {
    console.error("[GuardHistory][active] error", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default guardHistoryRouter;
