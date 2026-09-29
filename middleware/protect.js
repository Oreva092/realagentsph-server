import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function protect(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    // Step 1: is the token itself valid? Any failure here really is a 401.
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }
        return res.status(401).json({ message: "Not authorized" });
    }

    // Step 2: does the admin still exist? A failure here is a server problem (500), not an auth problem,
    // so the frontend doesn't log the admin out over a database hiccup.
    let admin;
    try {
        admin = await Admin.findById(decoded.id).select("-password -resetPasswordToken -resetPasswordExpires");
    } catch (error) {
        console.error("Auth middleware database error:", error);
        return res.status(500).json({ message: "Server error. Please try again." });
    }

    if (!admin) {
        return res.status(401).json({ message: "Not authorized" });
    }

    // Tokens issued before the last password change are dead
    if (admin.passwordChangedAt && decoded.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)) {
        return res.status(401).json({ message: "Password was changed. Please log in again." });
    }

    req.admin = admin;
    next();
}