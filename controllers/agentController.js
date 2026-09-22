import Agent from "../models/Agent.js";
import { sendEmail } from "../utils/mailer.js";
import { escapeHtml } from "../utils/escapeHtml.js";

export async function registerAgent(req, res) {
    try {
        const agent = await Agent.create(req.body);

        // Notify the admin — a failed email should never block the agent's registration itself
        try {
            const whatsappLink = `https://wa.me/${agent.whatsapp.replace(/\D/g, "")}`;
            await sendEmail({
                to: process.env.ADMIN_NOTIFY_EMAIL,
                subject: `New agent registration: ${agent.name}`,
                text: `${agent.name} just registered.\nArea: ${agent.area}\nWhatsApp: ${agent.whatsapp}\nReach out: ${whatsappLink}`,
                html: `
                    <p><strong>${escapeHtml(agent.name)}</strong> just registered as an agent.</p>
                    <p><strong>Area:</strong> ${escapeHtml(agent.area)}</p>
                    <p><strong>Property types:</strong> ${escapeHtml(agent.type.join(", "))}</p>
                    <p><a href="${whatsappLink}">Message them on WhatsApp</a></p>
                    <p>Review and approve them in the admin dashboard.</p>
                `,
            });
        } catch (emailErr) {
            console.error("Failed to send registration notification email:", emailErr);
        }

        res.status(201).json({
            message: "Application received successfully",
            agent
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An application with this WhatsApp number already exists. If you believe this is a mistake or your first submission didn't go through, please contact us on WhatsApp directly."
            });
        }
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }
        console.error("Agent registration error:", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
}

// Public — visitors only ever see approved agents
export async function getPublicAgents(req, res) {
    try {
        const agents = await Agent.find({ status: "approved" }).sort({ createdAt: -1 });
        res.status(200).json(agents);
    } catch (error) {
        console.error("Fetch agents error:", error);
        res.status(500).json({ message: "Could not fetch agents. Please try again." });
    }
}

// Admin — sees every agent, any status
export async function getAllAgentsAdmin(req, res) {
    try {
        const agents = await Agent.find().sort({ createdAt: -1 });
        res.status(200).json(agents);
    } catch (error) {
        console.error("Fetch agents (admin) error:", error);
        res.status(500).json({ message: "Could not fetch agents. Please try again." });
    }
}

export async function getAgentById(req, res) {
    try {
        const agent = await Agent.findById(req.params.id);

        // Not found AND not approved both return the same 404 —
        // a pending/rejected agent's profile should be just as invisible as a nonexistent one
        if (!agent || agent.status !== "approved") {
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json(agent);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(404).json({ message: "Agent not found" });
        }
        console.error("Fetch agent by id error:", error);
        res.status(500).json({ message: "Could not fetch agent. Please try again." });
    }
}

export async function updateAgent(req, res){
    try {
        const allowed = {};
        if (typeof req.body.verified === "boolean") allowed.verified = req.body.verified;
        if (req.body.rating !== undefined) allowed.rating = req.body.rating;
        if (typeof req.body.status === "string") allowed.status = req.body.status;

        const agent = await Agent.findByIdAndUpdate(req.params.id, allowed, {
            returnDocument: 'after',
            runValidators: true
        });

        if(!agent){
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json(agent);
    } catch (error){
        if(error.name === "CastError"){
            return res.status(404).json({ message: "Agent not found" });
        }
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages.join(", ") });
        }
        console.error("Update agent error:", error);
        res.status(500).json({ message: "Could not update agent." });
    }
}

export async function deleteAgent(req, res){
    try {
        const agent = await Agent.findByIdAndDelete(req.params.id);

        if(!agent){
            return res.status(404).json({ message: "Agent not found" });
        }

        res.status(200).json({ message: "Agent removed" });
    } catch (error){
        if(error.name === "CastError"){
            return res.status(404).json({ message: "Agent not found" });
        }
        console.error("Delete agent error:", error);
        res.status(500).json({ message: "Could not remove agent" });
    }
}