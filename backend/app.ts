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
import helmet from "helmet";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

export interface ResponseBody {
  message: string;
  payload?: unknown;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
    origin: "*", // Allow all origins for simplicity. Restrict this in production.
  },
});

app.set("Socket", io);

// Define your list of allowed origins
const allowedOrigins = ["http://localhost:4200", "http://localhost:8100"]; // Replace with your frontend URLs

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
app.use(helmet());
app.use(cors(corsOptions));

app.disable("x-powered-by");

app.get("/", (req, res) => {
  res.send("Welcome to the API. Another one.");
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

// Web Socket
io.on("connection", (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`User ${socket.id} disconnected`);
  });
});

export default app;
