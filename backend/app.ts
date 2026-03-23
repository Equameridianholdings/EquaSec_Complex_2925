import complexRouter from "#routes/complex.js";
import emergencyContactRouter from "#routes/emergenyContact.js";
import gatedCommunityRouter from "#routes/gatedCommunity.js";
import guardHistoryRouter from "#routes/guardHistory.js";
import incidentRouter from "#routes/incident.js";
import logsRouter from "#routes/logs.js";
import paymentRouter from "#routes/payment.js";
import securityCompanyRouter from "#routes/securityCompany.js";
import sosRouter from "#routes/sos.js";
import unitRouter from "#routes/unit.js";
import userRouter from "#routes/user.js";
import vehicleRouter from "#routes/vehicle.js";
import visitorRouter from "#routes/visitor.js";
import cors, { CorsOptions } from "cors";
import express, { urlencoded } from "express";
import * as helmet from "helmet";

export interface ResponseBody {
  message: string;
  payload?: unknown;
}

const app = express();

// Configure CORS options
const corsOptions: CorsOptions = {
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PATCH", "DELETE"], // Specify allowed methods
  optionsSuccessStatus: 204, // Use 204 for successful OPTIONS requests
  origin: "*",
};

app.use(express.json({ limit: '10mb'}));
app.use(urlencoded({ extended: true ,limit: '10mb'}))

app.use(cors(corsOptions));

app.use(helmet.contentSecurityPolicy());
app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.send(`Welcome to the API.`);
});

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
app.use("/gatedCommunity", gatedCommunityRouter);
app.use("/guardHistory", guardHistoryRouter);
app.use("/payment", paymentRouter);

export default app;
