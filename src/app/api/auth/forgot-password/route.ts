import { NextResponse } from "next/server";
import { admin } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log(`Generating password reset link for ${email}...`);

    // 1. Configure NodeMailer (Using existing verified setup)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Generate Link via Firebase Admin
    let resetLink;
    try {
      resetLink = await admin.auth().generatePasswordResetLink(email);
      console.log("Reset Link Generated:", resetLink);
    } catch (adminError: any) {
      console.error("Firebase Admin Error:", adminError);
      if (adminError.code === 'auth/user-not-found') {
        return NextResponse.json({ error: "No user found with this email." }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to generate reset link." }, { status: 500 });
    }

    // 3. Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset Your EarnFlow Password",
      text: `Hello,\n\nYou requested a password reset for your EarnFlow account.\n\nClick this link to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Reset Password Request</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your <strong>EarnFlow</strong> account.</p>
          <p>Click the button below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Reset Password</a>
          <p style="color: #666; font-size: 14px;">If you didn't ask to reset your password, you can safely ignore this email.</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Reset email sent successfully to ${email}`);
      return NextResponse.json({ success: true, message: "Reset email sent successfully" });
    } catch (smtpError: any) {
      console.error("SMTP Error:", smtpError);
      return NextResponse.json({ error: "Failed to send email via Gmail." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
