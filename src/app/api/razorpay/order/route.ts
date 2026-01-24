import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { amount, currency = "INR", receipt } = await req.json();

    const options = {
      amount: amount * 100, // Razorpay expects amount in paisa
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
  } catch (err: any) {
    console.error("Razorpay Order Error Details:", err);
    return NextResponse.json({
      error: "Failed to create order",
      details: err.message || "Unknown error",
      code: err.code
    }, { status: 500 });
  }
}
