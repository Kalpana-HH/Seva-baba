import nodemailer from 'nodemailer';

const DEFAULT_GMAIL_USER = "920384h@gmail.com";
const DEFAULT_GMAIL_PASS = "kjforlykxfxpebix";

export default async function handler(req: any, res: any) {
  // Support POST requests for email dispatch
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, text, html, customSmtp } = req.body || {};
    if (!to || !subject) {
      return res.status(400).json({ error: "Recipient 'to' and 'subject' are required." });
    }

    const user = customSmtp?.user || process.env.SMTP_USER || DEFAULT_GMAIL_USER;
    const pass = customSmtp?.pass || process.env.SMTP_PASS || DEFAULT_GMAIL_PASS;
    const host = customSmtp?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(customSmtp?.port || process.env.SMTP_PORT || 587);

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''),
      },
    });

    const senderEmail = user;

    const info = await transporter.sendMail({
      from: `"GatherCraft Planner" <${senderEmail}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: text || "You have an automated event update from GatherCraft Planner.",
      html: html || `<p>${text || "You have an automated event update from GatherCraft Planner."}</p>`,
    });

    return res.status(200).json({
      success: true,
      message: 'Automated email dispatched successfully via Gmail SMTP!',
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('Vercel Email Dispatch Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch automated email',
    });
  }
}
