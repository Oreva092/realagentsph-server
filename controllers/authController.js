import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function adminLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

        if (!admin || !(await admin.matchPassword(password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: admin._id, role: "admin" },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.status(200).json({
            token,
            admin: { id: admin._id, name: admin.name, email: admin.email }
        });
    } catch (error) {
        console.error("Admin login error:", error);
        res.status(500).json({ message: "Login failed. Please try again." });
    }
}