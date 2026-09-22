import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, text, html }) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter.sendMail({
        from: `"RealAgents PH" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
    });
}