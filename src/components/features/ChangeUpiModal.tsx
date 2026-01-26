
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface ChangeUpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUpi: string;
}

export function ChangeUpiModal({ isOpen, onClose, currentUpi }: ChangeUpiModalProps) {
  const { user } = useAuth();
  const [newUpi, setNewUpi] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newUpi === currentUpi) {
      toast.error("New UPI ID must be different");
      return;
    }

    if (!newUpi.includes("@")) {
      toast.error("Invalid UPI ID format");
      return;
    }

    setLoading(true);
    try {
      const now = Timestamp.now();
      const validAfter = new Timestamp(now.seconds + (15 * 24 * 3600), 0); // 15 Days

      await updateDoc(doc(db, "users", user.uid), {
        upiChangeRequest: {
          newUpiId: newUpi,
          requestedAt: now,
          validAfter: validAfter,
          status: "pending"
        }
      });

      toast.success("UPI Change Requested! It will auto-update in 15 days.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0a0a] border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <Clock className="h-5 w-5" /> Change UPI ID
          </DialogTitle>
          <DialogDescription>
            Security Policy: Payment details updates take <strong>15 Days</strong> to process automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Current UPI ID</Label>
            <div className="p-3 bg-white/5 rounded-md text-sm text-muted-foreground font-mono">
              {currentUpi || "Not Set"}
            </div>
          </div>

          <div className="space-y-2">
            <Label>New UPI ID</Label>
            <Input
              value={newUpi}
              onChange={(e) => setNewUpi(e.target.value)}
              placeholder="e.g. username@okhdfcbank"
              className="bg-white/5 border-white/10"
              required
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-500/90">
              This request will remain <strong>Pending</strong> for 15 days. Admins can verify and approve it earlier if needed.
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newUpi} className="bg-amber-500 text-black font-bold hover:bg-amber-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
