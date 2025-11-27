import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SplitBillForm from "@/components/SplitBillForm";
import TransactionHistory from "@/components/TransactionHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Receipt, History, UserCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("split");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
      else navigate("/auth");
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") navigate("/auth");
      else if (session?.user) setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message || "Gagal logout");
    else toast.success("Berhasil logout");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );

  if (!user) return null;

  return (
    <div className="dashboard-wrapper min-h-screen w-full bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="w-full bg-card border-b shadow-soft px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Split Bill
          </h1>
          <p className="text-sm text-muted-foreground">
            Selamat datang, {user.user_metadata?.full_name || user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/profile")} size="sm">
            <UserCircle className="mr-2 h-4 w-4" />
            Profil
          </Button>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="split" className="gap-2 text-sm">
              <Receipt className="h-4 w-4" />
              Bagi Tagihan
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-sm">
              <History className="h-4 w-4" />
              Riwayat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="split">
            <div className="bg-card rounded-xl shadow-soft p-6 w-full max-w-6xl mx-auto">
              <SplitBillForm userId={user.id} />
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="bg-card rounded-xl shadow-soft p-6 w-full max-w-6xl mx-auto">
              <TransactionHistory userId={user.id} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
