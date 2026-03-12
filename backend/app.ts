import complexRouter from "#routes/complex.js";
import emergencyContactRouter from "#routes/emergenyContact.js";
import gatedCommunityRouter from "#routes/gatedCommunity.js";
import guardHistoryRouter from "#routes/guardHistory.js";
import incidentRouter from "#routes/incident.js";
import logsRouter from "#routes/logs.js";
import securityCompanyRouter from "#routes/securityCompany.js";
import sosRouter from "#routes/sos.js";
import unitRouter from "#routes/unit.js";
import userRouter from "#routes/user.js";
import vehicleRouter from "#routes/vehicle.js";
import visitorRouter from "#routes/visitor.js";
import cors, { CorsOptions } from "cors";
import express from "express";
import * as helmet from "helmet";

export interface ResponseBody {
  message: string;
  payload?: unknown;
}

const URI = process.env.MONGODB_URI as unknown as string;
const DB_NAME = process.env.DB_NAME as unknown as string;

const app = express();

// Define your list of allowed origins
const allowedOrigins = ["http://localhost:4200", "http://localhost:8100", "https://www.equasec.co.za","https://equa-sec-complex-2925-ldhl.vercel.app"]; // Replace with your frontend URLs

// Configure CORS options
const corsOptions: CorsOptions = {
  credentials: true, // Allow cookies and authentication headers
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Specify allowed methods
  optionsSuccessStatus: 204, // Use 204 for successful OPTIONS requests
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin as unknown as string) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"), false);
    }
  },
};

app.use(express.json());
app.use(cors(corsOptions));

app.use(helmet.contentSecurityPolicy());
app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.send(`Welcome to the API. Connecting to MongoDB database: ${DB_NAME}. Connection String: ${URI}`);
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

export default app;
