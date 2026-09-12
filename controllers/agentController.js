import Agent from "../models/Agent.js";

export async function registerAgent(req, res) {
    try {
        const agent = await Agent.create(req.body);
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

export async function getAgents(req, res) {
    try {
        const agents = await Agent.find().sort({ createdAt: -1 });
        res.status(200).json(agents);
    } catch (error) {
        console.error("Fetch agents error:", error);
        res.status(500).json({ message: "Could not fetch agents. Please try again." });
    }
}