import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Users, Calculator, Camera } from "lucide-react";
import heroImage from "@/assets/hero-split-bill.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-90" />
        <img 
          src={heroImage} 
          alt="Split bills with friends" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 text-center text-white">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
            Split Bill
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto px-4">
            Bagi tagihan dengan mudah dan adil menggunakan AI
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-6"
          >
            Mulai Sekarang
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="shadow-medium hover:shadow-large transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Scan Struk AI</h3>
              <p className="text-sm text-muted-foreground">
                Upload foto struk dan AI akan otomatis mendeteksi item & harga
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-large transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Multi Peserta</h3>
              <p className="text-sm text-muted-foreground">
                Tambah 2-10 orang dan assign item ke masing-masing peserta
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-large transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Perhitungan Otomatis</h3>
              <p className="text-sm text-muted-foreground">
                Sistem otomatis menghitung pembagian dengan biaya tambahan
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-medium hover:shadow-large transition-shadow">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Riwayat Transaksi</h3>
              <p className="text-sm text-muted-foreground">
                Semua transaksi tersimpan untuk referensi di masa depan
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 text-center">
        <Card className="max-w-2xl mx-auto shadow-large border-primary/20">
          <CardContent className="pt-8 sm:pt-10 lg:pt-12 pb-8 sm:pb-10 lg:pb-12 px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Siap Mulai Membagi Tagihan?</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
              Login dengan Google dan mulai bagi tagihan dalam hitungan detik
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-primary text-white shadow-glow text-sm sm:text-base"
            >
              Masuk dengan Google
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
