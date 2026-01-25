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
    console.log("Checking Environment Variables...");
    console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Loaded (Ending in " + process.env.EMAIL_USER.split('@')[1] + ")" : "NOT LOADED");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      logger: true,
      debug: true,
    });

    try {
      console.log("Verifying transporter connection...");
      await transporter.verify();
      console.log("Transporter verification successful.");
    } catch (verifyError: any) {
      console.error("Transporter Verification Failed:", verifyError.message);
      return NextResponse.json({
        success: false,
        error: "SMTP Connection failed. Check App Password.",
        details: verifyError.message
      }, { status: 500 });
    }

    console.log(`Attempting to send OTP to ${email}...`);
    // ... rest of the code


    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your OTP Code: ${otp}`,
      text: `Hello ${name || "User"},\n\nYour OTP code is: ${otp}\n\nThis code is valid for 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #f59e0b;">Your OTP Code</h2>
          <p>Hi ${name || "User"},</p>
          <p>Your verification code is: <strong style="font-size: 24px; color: #b91c1c;">${otp}</strong></p>
          <p style="font-size: 12px; color: #666;">This code is valid for 10 minutes.</p>
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

