"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, doc, updateDoc, orderBy, deleteDoc, deleteField } from "firebase/firestore";
import { Loader2, Search, ShieldAlert, ShieldCheck, Trash2, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'premium', 'free'
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, "users", id), { status: newStatus });
      toast.success(`User ${newStatus}!`);

      // Optimistic update
      setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
      if (selectedUser?.id === id) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (err) {
      toast.error("Status update failed.");
    }
  };

  const togglePremium = async (id: string, currentPremium: boolean) => {
    try {
      await updateDoc(doc(db, "users", id), { isPremium: !currentPremium });
      toast.success(`Premium status updated!`);
      // Optimistic update
      setUsers(users.map(u => u.id === id ? { ...u, isPremium: !currentPremium } : u));
      if (selectedUser?.id === id) {
        setSelectedUser({ ...selectedUser, isPremium: !currentPremium });
      }
    } catch (err) {
      toast.error("Premium update failed.");
    }
  };

  const handleUpdateCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsUpdating(true);

    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        coins: Number(selectedUser.coins),
        totalEarned: Number(selectedUser.totalEarned)
      });
      toast.success("User finances updated!");

      // Optimistic update
      setUsers(users.map(u => u.id === selectedUser.id ? {
        ...u,
        coins: Number(selectedUser.coins),
        totalEarned: Number(selectedUser.totalEarned)
      } : u));

    } catch (err) {
      toast.error("Failed to update coins.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete user "${name}"? This action cannot be undone.`)) return;

    // Optimistic delete UI update
    const prevUsers = [...users];
    setUsers(users.filter(u => u.id !== id));

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      toast.success("User deleted from System & Auth!");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to delete: ${err.message}`);
      setUsers(prevUsers); // Revert UI
    }
  };

  const handleApproveUpi = async (userId: string, newUpi: string) => {
    // ... logic is already there in file, just need to close the function above

    if (!newUpi) {
      toast.error("Cannot Approve: Request is missing UPI ID. Please ask user to request again.");
      return;
    }

    if (!confirm(`Approve UPI Change to ${newUpi}?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), {
        savedUpi: newUpi,
        upiChangeRequest: deleteField()
      });
      toast.success("UPI Updated Successfully!");
      setIsModalOpen(false);
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, savedUpi: newUpi, upiChangeRequest: null } : u));
    } catch (e: any) {
      const isNotFound = e.code === 'not-found' || e.message?.includes('No document to update');

      if (!isNotFound) {
        console.error(e);
        toast.error("Failed to approve");
      } else {
        toast.warning("User was already deleted. Removing from list.");
        setUsers(prev => prev.filter(u => u.id !== userId));
        setIsModalOpen(false);
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.referralCode?.toLowerCase().includes(search.toLowerCase());

    if (filter === "admins") return matchesSearch && u.isAdmin;
    if (filter === "requests") return matchesSearch && u.upiChangeRequest?.status === 'pending';

    // For other tabs, EXCLUDE admins
    if (u.isAdmin) return false;

    if (filter === "premium") return matchesSearch && u.isPremium;
    if (filter === "free") return matchesSearch && !u.isPremium;

    // 'all' includes everyone EXCEPT admins
    return matchesSearch;
  });

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">All</Button>
          <Button variant={filter === "premium" ? "default" : "outline"} onClick={() => setFilter("premium")} size="sm" className={filter === "premium" ? "bg-amber-500 hover:bg-amber-600" : ""}>Premium</Button>
          <Button variant={filter === "free" ? "default" : "outline"} onClick={() => setFilter("free")} size="sm">Free</Button>
          <Button variant={filter === "requests" ? "default" : "outline"} onClick={() => setFilter("requests")} size="sm" className={filter === "requests" ? "bg-amber-500 text-black font-bold" : "relative"} >
            Requests
            {users.filter(u => u.upiChangeRequest?.status === 'pending').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {users.filter(u => u.upiChangeRequest?.status === 'pending').length}
              </span>
            )}
          </Button>
          <Button variant={filter === "admins" ? "default" : "outline"} onClick={() => setFilter("admins")} size="sm" className={filter === "admins" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" : "text-red-500 hover:bg-red-500/5"}>Admins</Button>

        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-card border-white/10"
            placeholder="Search name, email, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border border-white/10 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User & ID</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Coins</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">No users found.</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name || "No Name"}</div>
                    <div className="text-xs font-mono text-amber-500">{user.referralCode || "NO-ID"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={user.isPremium ? "default" : "secondary"}>
                      {user.isPremium ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{(user.coins || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {user.status === 'blocked' ? (
                      <span className="text-red-500 font-bold">BLOCKED</span>
                    ) : (
                      (() => {
                        const lastSeen = user.lastSeen?.toDate ? user.lastSeen.toDate() : new Date(0);
                        const diffMins = (new Date().getTime() - lastSeen.getTime()) / 60000;
                        const isOnline = diffMins < 5; // Online if active in last 5 mins

                        return (
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                            <span className={isOnline ? 'text-green-500 font-bold' : 'text-muted-foreground'}>
                              {isOnline ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {user.isAdmin ? (
                      <Badge variant="outline" className="border-red-500/50 text-red-500">Super Admin</Badge>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" className="mr-2" onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}>View</Button>
                        <Button
                          variant={user.status === 'blocked' ? "outline" : "destructive"}
                          size="sm"
                          className={user.status === 'blocked' ? "bg-green-600/10 text-green-500 mr-2" : "mr-2"}
                          onClick={() => toggleStatus(user.id, user.status || 'active')}
                        >
                          {user.status === 'blocked' ? (
                            <><ShieldCheck className="h-4 w-4 mr-1" /> Unblock</>
                          ) : (
                            <><ShieldAlert className="h-4 w-4 mr-1" /> Block</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeleteUser(user.id, user.name || user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View/Edit User Modal */}
      {selectedUser && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="User Details">
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Full Name</p>
                <p className="font-medium">{selectedUser.name || "N/A"}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">User ID</p>
                <p className="font-mono text-[10px] truncate leading-5">
                  <span className="block text-amber-500 text-base">{selectedUser.referralCode}</span>
                  <span className="opacity-50 text-[9px]">{selectedUser.id}</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Email Address</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>

              {selectedUser.upiChangeRequest?.status === 'pending' && (
                <div className="col-span-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                    <AlertTriangle className="h-4 w-4" /> Pending UPI Change
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Current:</span>
                      <div className="font-mono">{selectedUser.savedUpi || "None"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Requested:</span>
                      <div className="font-mono text-white">{selectedUser.upiChangeRequest.newUpiId}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Waiting for your approval
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApproveUpi(selectedUser.id, selectedUser.upiChangeRequest.newUpiId)}
                    className="w-full bg-amber-500 text-black font-bold hover:bg-amber-600"
                  >
                    Approve Change Now (Manual)
                  </Button>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateCoins} className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-amber-500">Financial Management</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Current Coins</label>
                  <Input
                    type="number"
                    value={selectedUser.coins || 0}
                    onChange={e => setSelectedUser({ ...selectedUser, coins: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Total Earned</label>
                  <Input
                    type="number"
                    value={selectedUser.totalEarned || 0}
                    onChange={e => setSelectedUser({ ...selectedUser, totalEarned: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="w-full bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Update Finances"}
              </Button>
            </form>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-amber-500">Access Control</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="text-sm font-medium">Premium Membership</p>
                  <p className="text-[10px] text-muted-foreground">Give or remove full access</p>
                </div>
                <Button
                  size="sm"
                  variant={selectedUser.isPremium ? "destructive" : "default"}
                  onClick={() => togglePremium(selectedUser.id, selectedUser.isPremium)}
                >
                  {selectedUser.isPremium ? "Remove" : "Give"} Premium
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="text-sm font-medium">Account Status</p>
                  <p className="text-[10px] text-muted-foreground capitalize">Currently: {selectedUser.status || 'active'}</p>
                </div>
                <Button
                  size="sm"
                  variant={selectedUser.status === 'blocked' ? "outline" : "destructive"}
                  onClick={() => toggleStatus(selectedUser.id, selectedUser.status || 'active')}
                >
                  {selectedUser.status === 'blocked' ? "Unblock User" : "Block User"}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                <h4 className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Referral Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Their Code</p>
                    <p className="font-bold">{selectedUser.referralCode || "NONE"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Referred By</p>
                    <p className="font-bold">{selectedUser.referredBy || "NONE"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                <h4 className="text-xs font-bold text-red-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" /> Danger Zone
                </h4>
                <p className="text-[10px] text-muted-foreground mb-4">
                  Deleting a user is permanent and will remove all their coins, earnings, and profile data from the system.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full bg-red-600/20 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white"
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name || selectedUser.email)}
                >
                  Permanently Delete Account
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
