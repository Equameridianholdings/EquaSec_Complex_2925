import app from "#app.js";
import mongoose from "mongoose";

const URI = process.env.ATLAS_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

// MongoDB Connection
void mongoose.connect(`${URI}${DB_NAME}`);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000

app.listen(PORT, () => {
    console.log(`Running server on http://localhost:${PORT as unknown as string}`);
});