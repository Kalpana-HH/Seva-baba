import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Automated Free Email Dispatcher
const DEFAULT_GMAIL_USER = "920384h@gmail.com";
const DEFAULT_GMAIL_PASS = "kjforlykxfxpebix";
let etherealTransporter: nodemailer.Transporter | null = null;

async function getTransporter(customSmtp?: { host?: string; port?: number; user?: string; pass?: string }) {
  const user = customSmtp?.user || process.env.SMTP_USER || DEFAULT_GMAIL_USER;
  const pass = customSmtp?.pass || process.env.SMTP_PASS || DEFAULT_GMAIL_PASS;
  const host = customSmtp?.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(customSmtp?.port || process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ""),
      },
    });
  }

  if (!etherealTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("[Free Automated Email] Ethereal inbox initialized:", testAccount.user);
  }
  return etherealTransporter;
}

app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text, html, customSmtp } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: "Recipient 'to' and 'subject' are required." });
    }

    const transporter = await getTransporter(customSmtp);
    const senderEmail = customSmtp?.user || process.env.SMTP_USER || DEFAULT_GMAIL_USER;

    const info = await transporter.sendMail({
      from: `"GatherCraft Planner" <${senderEmail}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: text || "You have an automated event update from GatherCraft Planner.",
      html: html || `<p>${text || "You have an automated event update from GatherCraft Planner."}</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return res.json({
      success: true,
      message: "Automated email dispatched successfully via Gmail SMTP!",
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
      isTestInbox: false,
    });
  } catch (err: any) {
    console.error("Automated Email Dispatch Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to dispatch automated email",
    });
  }
});

// 3. Mount Vite or serve static assets based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for all SPA routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
