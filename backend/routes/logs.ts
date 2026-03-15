import logSchema from "#db/logsSchema.js";
import { logDTO } from "#interfaces/logDTO.js";
import AuthMiddleware from "#middleware/auth.middleware.js";
import { ValidObjectId } from "#utils/validObjectId.js";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { isValidObjectId } from "mongoose";

const logsRouter = Router();

logsRouter.use(AuthMiddleware);

logsRouter.get("/", async (req, res) => {
  try {
    const logs = await logSchema.find({});

    if (logs.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json({message: "All logs retrieved", payload: logs});
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

logsRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  const logQuery = {
    "guard.securityCompany._id": ValidObjectId(id),
  };
  try {
    const logs = await logSchema.find(logQuery);

    if (logs.length === 0) {
      res.status(404).json({ message: "No logs found!" });
      return;
    }

    res.status(200).json(logs);
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

logsRouter.delete("/", async (req, res) => {
  //Define logic for deleting logs that are 1 year old
  const validDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const logQuery = {
    date: { $ls: validDate },
  };
  try {
    const deletedLogs = await logSchema.find<logDTO>(logQuery).select({}).exec();

    if (deletedLogs.length === 0) {
      res.status(404).json({ message: "No logs found" });
      return;
    }

    deletedLogs.forEach((log) => {
      if (isValidObjectId(log._id as unknown as string)) logSchema.deleteOne({ _id: new ObjectId(log._id) });
      else {
        res.status(400).json({ message: "Bad Request! Error with Id." });
        return;
      }
    });

    res.status(200).json({ message: "Logs successfully deleted" });
    return;
  } catch {
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

export default logsRouter;
