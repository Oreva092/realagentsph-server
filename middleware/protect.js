import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function protect(req, res, next){
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select("-password");

        if(!admin){
            return res.status(401).json({ message: "Not authorized" });
        }

        req.admin = admin;
        next();
    } catch (error){
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }
        return res.status(401).json({ message: "Not authorized." });
    }
}