import app from "#app.js";
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

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000;

app.listen(PORT, () => {
  console.log(`Live server running on http://localhost:${PORT as unknown as string}`);
});
