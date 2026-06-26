import { Router, Request, Response } from "express";
import { Resend } from "resend";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body ?? {};

    if (!name || !email || !message) {
      res.status(400).json({ error: "Name, email and message are required" });
      return;
    }

    if (message.trim().length < 10) {
      res.status(400).json({ error: "Message is too short" });
      return;
    }

    await resend.emails.send({
      from: "SardineWatch Contact <noreply@sardinewatch.co.za>",
      to: "support@sardinewatch.co.za",
      replyTo: email,
      subject: `Contact form message from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0e7490; font-size: 22px; margin: 0;">🐟 SardineWatch — New Contact Message</h1>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 80px;">Name</td>
              <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #0e7490;">${email}</a></td>
            </tr>
          </table>
          <div style="background: white; border-radius: 12px; padding: 16px 20px; border: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
            <p style="color: #1e293b; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; text-align: center;">
            Reply directly to this email to respond to ${name}.
          </p>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

export default router;
