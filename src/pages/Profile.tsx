import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, User, Lock } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, { message: "Nama tidak boleh kosong" }).max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Password lama harus diisi" }),
  newPassword: z.string().min(6, { message: "Password baru minimal 6 karakter" }).max(100),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password harus diisi" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru tidak cocok",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "Password baru harus berbeda dengan password lama",
  path: ["newPassword"],
});

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setFullName(session.user.user_metadata?.full_name || "");
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      profileSchema.parse({ fullName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setSavingProfile(true);
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      toast.success("Profil berhasil diperbarui!");
    } catch (error: any) {
      toast.error("Gagal memperbarui profil");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ currentPassword, newPassword, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    setSavingPassword(true);
    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Password lama salah!");
        setSavingPassword(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password berhasil diperbarui!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Gagal memperbarui password");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-1 sm:gap-2"
            size="sm"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Kembali ke Dashboard</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-2xl">
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Info */}
          <Card className="shadow-medium">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                Informasi Profil
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Perbarui nama panggilan Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted text-xs sm:text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Email tidak dapat diubah
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs sm:text-sm">Nama Panggilan *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nama Anda"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    required
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Maksimal 100 karakter
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full text-xs sm:text-sm"
                  size="sm"
                >
                  {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Separator />

          {/* Change Password */}
          <Card className="shadow-medium">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                Ubah Password
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Perbarui password untuk keamanan akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-xs sm:text-sm">Password Lama *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs sm:text-sm">Password Baru *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                    className="text-xs sm:text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Minimal 6 karakter
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Konfirmasi Password Baru *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                    className="text-xs sm:text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full text-xs sm:text-sm"
                  size="sm"
                >
                  {savingPassword ? "Memperbarui..." : "Ubah Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
