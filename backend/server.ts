import complexRouter from "#routes/complex.js";
import unitRouter from "#routes/unit.js";
import userRouter from "#routes/user.js";
import express from "express"
import mongoose from "mongoose";

const URI = process.env.ATLAS_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

const app = express();

app.use(express.json());

// MongoDB Connection
void mongoose.connect(`${URI}${DB_NAME}`);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

app.get("/", (req, res) => {
    res.send("Welcome to the API. Another one.");
})

app.use("/user", userRouter);
app.use("/unit", unitRouter);
app.use("/complex", complexRouter);

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000

app.listen(PORT, () => {
    console.log(`Running server on http://localhost:${PORT as unknown as string}`);
});