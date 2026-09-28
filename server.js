import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

import agentRoutes from "./routes/agentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js"

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = (process.env.CLIENT_URL || "").split(",").map((url) => url.trim());

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
}));

app.use(express.json({ limit: '10kb' }));


if(process.env.NODE_ENV !== "production"){
    app.use(morgan("dev"));
}


mongoose.set("sanitizeFilter", true);


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));


app.use("/api/agents", agentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);


// 404 handler - anything that doesn't match a route above
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});


// Centralized error handler - that catches anything passed through next(err) that individual routes didn't already handle themselves
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Something went wrong on our end." });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));