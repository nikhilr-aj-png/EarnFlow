"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, updatePassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Added imports
import { db } from "@/lib/firebase"; // Added imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Lock, Save, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [userData, setUserData] = useState<any>(null); // State for Firestore data
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await updateProfile(user, { displayName: name });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };


  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;
    setLoading(true);

    try {
      await updatePassword(user, newPassword);
      setNewPassword("");
      toast.success("Password updated successfully!");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast.error("Please re-login to change your password.");
      } else {
        toast.error("Failed to update password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-4 sm:py-8 px-2 sm:px-0">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">Profile Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account information and security.</p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card className="border-white/10 bg-card/50 rounded-2xl sm:rounded-3xl">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <User className="h-5 w-5 text-amber-500" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Update your public display name.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-6 pb-6">
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="h-12 bg-background/50 border-white/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Unique ID</label>
                <Input
                  value={userData?.referralCode || "Loading..."}
                  disabled
                  className="h-12 bg-background/50 border-white/10 font-mono text-amber-500 font-black tracking-widest rounded-xl disabled:opacity-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-12 bg-black/40 border-white/5 opacity-50 cursor-not-allowed rounded-xl"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest h-12 rounded-xl text-xs">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-white/10 bg-card/50 rounded-2xl sm:rounded-3xl">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Lock className="h-5 w-5 text-amber-500" />
              Security
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Change your password to keep secure.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-6 pb-6">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="h-12 bg-background/50 border-white/10 rounded-xl"
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={loading || !newPassword} variant="outline" className="w-full border-white/10 hover:bg-white/5 h-12 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white">
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
