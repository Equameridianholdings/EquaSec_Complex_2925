import app from "#app.js";
import visitorShema from "#db/visitorSchema.js";
import { ServerApiVersion } from "mongodb";
import mongoose from "mongoose";

const URI = process.env.MONGODB_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

// MongoDB Connection
const connectToDB = async () => {
  await mongoose.connect(URI, {
    dbName: DB_NAME,
    maxPoolSize: 150,
    serverApi: {
      deprecationErrors: true,
      strict: true,
      version: ServerApiVersion.v1,
    },
    timeoutMS: 10000,
  });
  await mongoose.connection.db?.admin().command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
};

connectToDB().catch(console.dir);

// Delete visitor records where arrivedAt is older than 90 days — runs on the 10th of each month
const runMonthlyVisitorCleanup = async () => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await visitorShema.deleteMany({ arrivedAt: { $lt: cutoff } }).exec();
    console.log("Monthly visitor cleanup complete (90-day retention).");
  } catch (err) {
    console.error("Monthly visitor cleanup failed:", err);
  }
};

const scheduleMonthlyCleanup = () => {
  const runIfTenth = () => {
    if (new Date().getDate() === 10) {
      runMonthlyVisitorCleanup();
    }
  };
  // Check immediately on startup in case the server restarts on the 10th
  runIfTenth();
  // Re-check every 24 hours
  setInterval(runIfTenth, 24 * 60 * 60 * 1000);
};

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000;

app.listen(PORT, () => {
  console.log(`Live server running on http://localhost:${PORT as unknown as string}`);
  scheduleMonthlyCleanup();
});
