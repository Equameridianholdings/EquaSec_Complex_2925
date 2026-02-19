import app from "#app.js";
import { MongoClient, ServerApiVersion } from "mongodb";
// import mongoose from "mongoose";

const URI = process.env.ATLAS_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

// MongoDB Connection
// void mongoose.connect(`${URI}${DB_NAME}`);

// const db = mongoose.connection;

// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', () => {
//   console.log('Connected to MongoDB');
// });

const client = new MongoClient(URI, {
  serverApi: {
    deprecationErrors: true,
    strict: true,
    version: ServerApiVersion.v1,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db(DB_NAME).command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

await run().catch(console.dir);

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000

app.listen(PORT, () => {
    console.log(`Running server on http://localhost:${PORT as unknown as string}`);
    
});