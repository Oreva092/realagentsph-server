// server.js  (updated: reviews route added)
import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import agentRoutes from "./routes/agentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// Fail fast: a server that boots without these fails in confusing ways later
const requiredEnv = ["MONGO_URI", "JWT_SECRET", "CLIENT_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
    process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters in production.");
    process.exit(1);
}

// These don't stop the server, but password reset and emails won't work without them
const emailEnv = ["FRONTEND_URL", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "ADMIN_NOTIFY_EMAIL"];
const missingEmailEnv = emailEnv.filter((key) => !process.env[key]);
if (missingEmailEnv.length > 0) {
    console.warn(`Email-related variables not set: ${missingEmailEnv.join(", ")}`);
}

const app = express();

// Needed so rate limiting sees real visitor IPs behind Render's proxy
app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/+$/, ""))
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // No origin = same-server or tools like curl/Postman, not a browser page
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    }
}));

app.use(express.json({ limit: "10kb" }));

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

mongoose.set("sanitizeFilter", true);

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use("/api/agents", agentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/reviews", reviewRoutes);

// Anything that doesn't match a route above
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// Central error handler: catches anything passed through next(err)
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({ message: "Origin not allowed" });
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body too large" });
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Something went wrong on our end." });
});

const PORT = process.env.PORT || 5000;

async function start() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

start();