import crypto from "crypto";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { sendEmail } from "../utils/mailer.js";
import { escapeHtml } from "../utils/escapeHtml.js";

export async function adminLogin(req, res) {
    try {
        const { email, password } = req.body;

        if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
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

export async function forgotPassword(req, res) {
    const { email } = req.body;

    if (typeof email !== "string" || !email) {
        return res.status(400).json({ message: "Email is required" });
    }

    // Same answer whether or not the account exists, so this can't be used to discover admin emails
    const genericResponse = {
        message: "If that email belongs to an admin account, a reset link has been sent."
    };

    try {
        const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

        if (admin) {
            const rawToken = crypto.randomBytes(32).toString("hex");

            // Only the hash is stored, so a database leak doesn't hand out working reset links
            admin.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
            admin.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
            await admin.save();

            const baseUrl = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
            const resetUrl = `${baseUrl}/admin/reset-password/${rawToken}`;

            // Email failure is caught separately: a 500 here would reveal that the account exists.
            // The error is still logged so a broken mailbox shows up in the server logs.
            try {
                await sendEmail({
                    to: admin.email,
                    subject: "Reset your RealAgents PH admin password",
                    text: `Hi ${admin.name},\n\nUse this link to reset your password (valid for 30 minutes):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
                    html: `
                        <p>Hi ${escapeHtml(admin.name)},</p>
                        <p>Use the link below to reset your admin password. It's valid for 30 minutes.</p>
                        <p><a href="${resetUrl}">Reset my password</a></p>
                        <p>If you didn't request this, you can ignore this email.</p>
                    `,
                });
            } catch (mailError) {
                console.error("Reset email failed to send:", mailError);
            }
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ message: "Could not process your request. Please try again." });
    }
}

export async function resetPassword(req, res) {
    const { token } = req.params;
    const { password } = req.body;

    if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const admin = await Admin.findOne({ resetPasswordToken: hashedToken });

        // Expiry is checked here in JS, not inside the query. The sanitizeFilter setting rewrites
        // "$gt" operators in queries, so a "$gt" filter would silently match nothing.
        if (!admin || !admin.resetPasswordExpires || admin.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ message: "This reset link is invalid or has expired." });
        }

        admin.password = password;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpires = undefined;
        admin.passwordChangedAt = new Date();
        await admin.save();

        res.status(200).json({ message: "Password updated. You can now log in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Could not reset your password. Please try again." });
    }
}