import { Resend } from "resend";

// NOTE: The API key must be set in Vercel's environment variables as
// RESEND_API_KEY. Sign up at resend.com (free tier) to get one.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared onboarding@resend.dev address works out of the box for
// testing, but for reliable delivery to real staff inboxes, verify a domain
// you own in the Resend dashboard and change this to something like
// "Great Joy Parish <noreply@yourdomain.com>".
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Great Joy Parish <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string, firstName?: string) {
  if (!resend) {
    console.error("[email] RESEND_API_KEY not configured — password reset email not sent");
    throw new Error("Email service not configured");
  }

  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  await resend.emails.send({
    from:    FROM_ADDRESS,
    to,
    subject: "Reset your Great Joy Parish password",
    html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #145C14;">Great Joy Parish</h2>
        <p>${greeting}</p>
        <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background:#145C14; color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:bold; display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color:#666; font-size:13px;">If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
        <p style="color:#999; font-size:12px; margin-top:24px;">If the button doesn't work, copy and paste this link:<br>${resetUrl}</p>
      </div>
    `,
  });
}
