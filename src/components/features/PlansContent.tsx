"use client";

import { useState } from "react";
import { Check, X, Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function PlansContent() {
  const { user, userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please login to upgrade your account.");
      return;
    }
    if (userData?.isPremium) {
      toast.info("You already have a Premium Earner plan!");
      return;
    }

    setIsSubmitting(true);
    const scriptLoaded = await loadRazorpay();

    if (!scriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Create Order
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 499,
          receipt: `upgrade_${user.uid}`
        }),
      });
      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.details || "Failed to create order");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key ID
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EarnFlow",
        description: "Premium Earner Upgrade",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // 2. Verify Payment
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                userId: user.uid,
                type: 'upgrade'
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success("Welcome to Premium! Your account has been upgraded.");
            } else {
              toast.error("Payment verification failed. Please contact support.");
            }
          } catch (err) {
            console.error(err);
            toast.error("Verification error.");
          }
        },
        prefill: {
          name: userData?.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#F59E0B",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <Card className="border-white/10 bg-card/30 backdrop-blur relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Starter</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">Free</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> daily check-in bonus</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-green-500" /> Access to basic tasks</li>
              <li className="flex items-center"><X className="mr-2 h-4 w-4 text-muted-foreground" /> No premium quizzes</li>
              <li className="flex items-center"><X className="mr-2 h-4 w-4 text-muted-foreground" /> Standard withdrawal speed</li>
              <li className="flex items-center"><X className="mr-2 h-4 w-4 text-muted-foreground" /> 5% Referral Commission</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled={!userData?.isPremium}>
              {userData?.isPremium ? "Standard Account" : "Current Plan"}
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="border-amber-500/30 bg-gradient-to-b from-amber-950/10 to-card/30 backdrop-blur relative overflow-hidden shadow-2xl shadow-amber-500/10">
          <div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <CardHeader>
            <CardTitle className="text-2xl text-amber-500">Premium Earner</CardTitle>
            <CardDescription>Maximize your daily income</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold flex items-baseline gap-1">
              ₹499 <span className="text-sm font-normal text-muted-foreground">/ monthly</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-amber-500" /> Double daily check-in bonus</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-amber-500" /> Access to high-paying tasks</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-amber-500" /> Unlimited Premium Quizzes</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-amber-500" /> Priority Fast Withdrawal (4hrs)</li>
              <li className="flex items-center"><Check className="mr-2 h-4 w-4 text-amber-500" /> 20% Referral Commission</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleUpgrade}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 border-0 hover:from-amber-600 hover:to-yellow-700 text-black font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                userData?.isPremium ? "Active Plan" : "Upgrade Now"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-2xl max-w-4xl mx-auto flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="font-bold text-amber-500">Safe & Secure Payments</p>
          <p className="text-sm text-muted-foreground">
            All payments are processed securely via Razorpay. Your data is encrypted and protected.
            Once payment is successful, your account features will be updated automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
