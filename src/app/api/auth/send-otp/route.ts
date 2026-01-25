import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // 1. Save OTP to Firestore
    try {
      console.log(`Writing OTP to Firestore for ${email}...`);
      await setDoc(doc(db, "verification_codes", email), {
        email,
        code: otp,
        expiresAt,
        createdAt: serverTimestamp(),
      });
      console.log("Firestore write successful.");
    } catch (fsError: any) {
      console.error("Firestore Error - Failed to save OTP:", fsError.message);
      return NextResponse.json({
        success: false,
        error: "Failed to initialize verification. Please try again.",
        details: fsError.message
      }, { status: 500 });
    }

    // 2. Configure NodeMailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      logger: true,
      debug: true,
    });

    console.log(`Attempting to send OTP to ${email}...`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,

      subject: "Verify Your EarnFlow Account - OTP",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #f59e0b; text-align: center;">Welcome to EarnFlow!</h2>
          <p>Hi ${name || "User"},</p>
          <p>Thank you for joining EarnFlow. To complete your registration and start earning, please verify your email using the following One-Time Password (OTP):</p>
          <div style="background: #fdf2f2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-bold; letter-spacing: 5px; color: #b91c1c;">${otp}</span>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="text-align: center; color: #999; font-size: 12px;">EarnFlow Team &copy; 2026</p>
        </div>
      `,
    };

    // 3. Send Email
    // Check if user has updated the credentials
    if (process.env.EMAIL_USER === "your-email@gmail.com") {
      console.warn("CRITICAL: EMAIL_USER is still using the placeholder value. OTP will not be sent.");
      return NextResponse.json({
        success: false,
        error: "Server configuration incomplete. Please contact administrator.",
        details: "Placeholder email credentials detected."
      }, { status: 500 });
    }

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP ${otp} successfully sent to ${email}`);
      } catch (smtpError: any) {
        console.error("SMTP Error - Failed to send email:", smtpError.message);
        return NextResponse.json({
          success: false,
          error: "Failed to deliver OTP email. Please try again later.",
          details: smtpError.message
        }, { status: 500 });
      }
    } else {
      console.log("-----------------------------------------");
      console.log(`MOCK EMAIL SENT TO: ${email}`);
      console.log(`OTP CODE: ${otp}`);
      console.log("-----------------------------------------");
      console.log("PRO TIP: Set EMAIL_USER and EMAIL_PASS for real emails.");
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

