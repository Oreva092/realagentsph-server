// server/controllers/contactController.js
import nodemailer from "nodemailer";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendContactMessage(req, res) {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "Name, email and message are required." });
  }

  // Quick sanity check while you're debugging — remove once it's confirmed working
  console.log("SMTP config check:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"RAP Contact Form" <${process.env.SMTP_USER}>`,
      to: "realagentsph.admin@gmail.com", // swap back to hello@realagentsph.com once that mailbox exists
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: message,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p><p>${escapeHtml(message)}</p>`,
    });

    res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    console.error("Failed to send contact email:", err);
    res.status(500).json({ message: "Could not send your message right now. Please try again later." });
  }
}