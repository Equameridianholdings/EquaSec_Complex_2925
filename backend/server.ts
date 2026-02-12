import complexRouter from "#routes/complex.js";
import emergencyContactRouter from "#routes/emergenyContact.js";
import incidentRouter from "#routes/incident.js";
import logsRouter from "#routes/logs.js";
import securityCompanyRouter from "#routes/securityCompany.js";
import sosRouter from "#routes/sos.js";
import subTenantRouter from "#routes/subtenant.js";
import unitRouter from "#routes/unit.js";
import userRouter from "#routes/user.js";
import vehicleRouter from "#routes/vehicle.js";
import visitorRouter from "#routes/visitor.js";
import express from "express"
import helmet from "helmet";
import mongoose from "mongoose";

const URI = process.env.ATLAS_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

const app = express();

app.use(express.json());
app.use(helmet());

app.disable("x-powered-by");

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

// Routes
app.use("/user", userRouter);
app.use("/unit", unitRouter);
app.use("/complex", complexRouter);
app.use("/visitor", visitorRouter);
app.use("/logs", logsRouter);
app.use("/emergencyContact", emergencyContactRouter);
app.use("/incident", incidentRouter);
app.use("/securityCompany", securityCompanyRouter);
app.use("/sos", sosRouter);
app.use("/subTenant", subTenantRouter);
app.use("/vehicle", vehicleRouter);

const PORT = Number.parseInt(process.env.PORT as unknown as string) || 3000

app.listen(PORT, () => {
    console.log(`Running server on http://localhost:${PORT as unknown as string}`);
});