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
      return NextResponse.json({
        error: "Failed to generate link. Server Error.",
        details: adminError.message
      }, { status: 500 });

    }

    // 3. Send Email
    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your password reset link",
      text: `Click here to reset your password: ${resetLink}`,
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}">Click here to reset it</a></p>
        <p>Link: ${resetLink}</p>
        <br>
        <p>Thanks,<br>EarnFlow Team</p>
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
    console.error("CRITICAL API ERROR:", error);
    // Explicitly log the error details to the server console
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);

    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message
    }, { status: 500 });
  }
}

