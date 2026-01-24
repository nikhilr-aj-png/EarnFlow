"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Loader2, CreditCard, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user, userData } = useAuth();
  const [amount, setAmount] = useState<string>("");
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

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 10) {
      toast.error("Minimum deposit is ₹10");
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
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          receipt: `deposit_${user?.uid}`
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.details || "Order creation failed");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "EarnFlow",
        description: "Wallet Coin Deposit",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // 2. Verify Payment
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                userId: user!.uid,
                type: 'deposit',
                amount: numAmount
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              toast.success(`Successfully added ${Math.floor(numAmount * 100)} coins to your wallet!`);
              onClose();
              setAmount("");
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            console.error(err);
            toast.error("Verification error.");
          }
        },
        prefill: {
          name: userData?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#F59E0B",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate deposit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const coinsPreview = amount ? Math.floor(parseFloat(amount) * 100) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Coins to Wallet">
      <div className="space-y-6">
        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deposit money securely via Razorpay. Every ₹1 gives you 100 coins.
            Minimum deposit is <span className="text-amber-500 font-bold">₹10</span>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-[10px]">Enter Amount (INR)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
              <Input
                type="number"
                placeholder="Ex: 100"
                className="pl-8 h-12 bg-white/5 border-white/10 text-lg font-bold focus:border-amber-500 transition-colors"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/20 p-2 rounded-lg">
                <Coins className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Coins to be added:</span>
            </div>
            <span className="text-xl font-black text-amber-500">{coinsPreview.toLocaleString()}</span>
          </div>
        </div>

        <Button
          className="w-full h-12 bg-amber-500 text-black font-bold hover:bg-amber-600 shadow-lg shadow-amber-500/10"
          onClick={handleDeposit}
          disabled={isSubmitting || !amount || parseFloat(amount) < 10}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay ₹{amount || "0"}
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
          Powered by Razorpay <ArrowRight className="h-2 w-2" /> Secure Checkout
        </p>
      </div>
    </Modal>
  );
}
