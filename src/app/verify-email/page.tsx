"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

function VerifyEmailForm() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { user } = useAuth();

  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Get code from Firestore
      const codeSnap = await getDoc(doc(db, "verification_codes", email!));

      if (!codeSnap.exists()) {
        setError("Invalid request. Please try resending the code.");
        setLoading(false);
        return;
      }

      const data = codeSnap.data();

      // 2. Validate code and expiry
      if (data.code !== otp) {
        setError("Invalid OTP code. Please check and try again.");
        setLoading(false);
        return;
      }

      const now = new Date();
      if (data.expiresAt.toDate() < now) {
        setError("OTP has expired. Please request a new one.");
        setLoading(false);
        return;
      }

      // 3. Mark user as verified
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          isVerified: true
        });
      }

      setVerified(true);
      toast.success("Account verified successfully!");

      // 4. Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: user?.displayName || "User" }),
      });

      if (res.ok) {
        toast.success("New OTP sent to your email.");
        setOtp("");
        setError("");
      } else {
        toast.error("Failed to resend OTP.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-white/10 bg-card/50 backdrop-blur-xl text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold mb-2">Verified!</CardTitle>
          <CardDescription>
            Your account has been successfully verified. Redirecting you to the dashboard...
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-white/10 bg-card/50 backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Verify Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit OTP code to <span className="text-white font-medium">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="space-y-2 text-center">
              <Input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="bg-secondary/50 border-white/10 h-14 text-center text-2xl tracking-[0.5em] font-bold focus:ring-amber-500"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your inbox
              </p>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white border-0 h-11"
              disabled={loading || otp.length !== 6}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground border-t border-white/5 pt-6">
          <div className="flex items-center justify-between w-full">
            <span>Didn't receive the code?</span>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-amber-500 hover:underline font-medium disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          </div>
          <Link href="/register" className="text-xs hover:text-white transition-colors">
            Back to Registration
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-amber-500">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
