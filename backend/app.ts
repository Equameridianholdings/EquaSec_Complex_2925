import complexRouter from "#routes/complex.js";
import emergencyContactRouter from "#routes/emergenyContact.js";
import incidentRouter from "#routes/incident.js";
import logsRouter from "#routes/logs.js";
import securityCompanyRouter from "#routes/securityCompany.js";
import sosRouter from "#routes/sos.js";
import unitRouter from "#routes/unit.js";
import userRouter from "#routes/user.js";
import vehicleRouter from "#routes/vehicle.js";
import visitorRouter from "#routes/visitor.js";
import cors from "cors";
import express, { Request } from "express"
import helmet from "helmet";

export interface ResponseBody {
    message: string;
    payload?: unknown; 
};

const app = express();

app.use(express.json());
app.use(helmet());
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
app.use(cors<Request>())

app.disable("x-powered-by");

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
app.use("/vehicle", vehicleRouter);

export default app;