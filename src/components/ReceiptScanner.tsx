import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReceiptScannerProps {
  onClose: () => void;
  onScanComplete: (items: any[]) => void;
}

export default function ReceiptScanner({ onClose, onScanComplete }: ReceiptScannerProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan JPG atau PNG");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Silakan login terlebih dahulu");
      }

      // Call edge function for AI OCR
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ image: base64 }),
        }
      );

      if (!response.ok) {
        throw new Error("Gagal memproses gambar");
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        onScanComplete(data.items);
        toast.success(`Berhasil mendeteksi ${data.items.length} item`);
      } else {
        toast.error("Tidak ada item yang terdeteksi");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal scan struk");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Scan Struk dengan AI</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardDescription>
              Upload foto struk untuk otomatis mendeteksi item dan harga
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setPreview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {loading ? (
                    <>
                      <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
                      <p className="text-sm text-muted-foreground">Memproses gambar...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Klik untuk upload</span> atau drag & drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG (MAX. 5MB)</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </label>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Tips untuk hasil terbaik:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Pastikan struk terlihat jelas dan tidak blur</li>
                <li>Hindari bayangan atau pantulan cahaya</li>
                <li>Foto langsung dari atas (tidak miring)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
