import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, MousePointerClick, Gift, Share2 } from "lucide-react";

export default function HowToEarnPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-20 lg:py-32">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">How to Earn</h1>
          <p className="text-muted-foreground">Four simple steps to start making money today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <Gift className="h-10 w-10 text-amber-500 mb-2" />
              <CardTitle>1. Daily Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Login every day to claim your free coin bonus. The streak bonus increases every week!</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <MousePointerClick className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>2. Complete Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Visit websites, watch short videos, or take surveys. New tasks are added hourly.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <Share2 className="h-10 w-10 text-purple-500 mb-2" />
              <CardTitle>3. Refer Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Share your unique link. Earn 500 coins instantly + up to 20% commission on their earnings.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
              <CardTitle>4. Upgrade Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Unlock higher paying tasks and faster withdrawals by upgrading your account.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
