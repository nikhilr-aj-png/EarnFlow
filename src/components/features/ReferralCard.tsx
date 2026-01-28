"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function ReferralCard({ code, isPremium }: { code: string, isPremium?: boolean }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(`https://earnflow.in/register?ref=${code}`);
    toast.success("Referral link copied!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/20 shadow-xl shadow-indigo-500/5 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-indigo-200">Invite & Earn</CardTitle>
          <CardDescription className="text-indigo-300/60 leading-tight">
            Earn {isPremium ? '1000' : '500'} coins for friend joins + {isPremium ? '20%' : '5%'} commission on their earnings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`https://earnflow.in/register?ref=${code}`}
              className="bg-black/40 border-indigo-500/20 text-indigo-100 h-9 text-xs"
            />
            <Button size="icon" onClick={handleCopy} variant="outline" className="h-9 w-9 border-indigo-500/30 hover:bg-indigo-500/20">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-black/40 border border-indigo-500/10">
              <div className="font-bold text-lg text-indigo-300">0</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Invites</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-indigo-500/10">
              <div className="font-bold text-lg text-amber-500">0</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Earned</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-indigo-500/10">
              <div className="font-bold text-lg text-green-500">{isPremium ? '20%' : '5%'}</div>
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Bonus</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
