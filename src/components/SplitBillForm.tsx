import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatRupiah, parseRupiah } from "@/lib/currency";
import { Plus, Trash2, Calculator, Users, Camera, ArrowRight, ArrowLeft } from "lucide-react";
import ReceiptScanner from "./ReceiptScanner";
import { z } from "zod";

const itemSchema = z.object({
  name: z.string().trim().min(1, { message: "Nama item tidak boleh kosong" }).max(100),
  price: z.number().positive({ message: "Harga harus lebih dari 0" }).max(999999999),
  quantity: z.number().int().positive().min(1).max(9999),
  category: z.string().max(50),
});

const participantSchema = z.object({
  name: z.string().trim().min(1, { message: "Nama peserta tidak boleh kosong" }).max(100),
});

const transactionSchema = z.object({
  title: z.string().trim().min(1, { message: "Judul tidak boleh kosong" }).max(200),
  description: z.string().trim().max(1000).optional(),
});

interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  assignedTo: string[];
}

interface Participant {
  id: string;
  name: string;
}

const CATEGORIES = [
  "Makanan",
  "Minuman",
  "Transportasi",
  "Akomodasi",
  "Hiburan",
  "Lainnya",
];

export default function SplitBillForm({ userId }: { userId: string }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tax, setTax] = useState("");
  const [service, setService] = useState("");
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");
  const [newItemCategory, setNewItemCategory] = useState("Makanan");

  const [newParticipantName, setNewParticipantName] = useState("");

  const addItem = () => {
    const price = parseRupiah(newItemPrice);
    const quantity = parseInt(newItemQuantity) || 1;

    try {
      itemSchema.parse({
        name: newItemName,
        price,
        quantity,
        category: newItemCategory,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    const newItem: Item = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      price,
      quantity,
      category: newItemCategory,
      assignedTo: [],
    };

    setItems([...items, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQuantity("1");
    toast.success("Item ditambahkan");
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast.success("Item dihapus");
  };

  const addParticipant = () => {
    try {
      participantSchema.parse({ name: newParticipantName });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    if (participants.length >= 10) {
      toast.error("Maksimal 10 peserta!");
      return;
    }
    if (participants.some((p) => p.name.toLowerCase() === newParticipantName.trim().toLowerCase())) {
      toast.error("Nama peserta sudah ada!");
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantName("");
    toast.success("Peserta ditambahkan");
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
    setItems(items.map((item) => ({
      ...item,
      assignedTo: item.assignedTo.filter((pId) => pId !== id),
    })));
    toast.success("Peserta dihapus");
  };

  const toggleAssignment = (itemId: string, participantId: string) => {
    setItems(items.map((item) => {
      if (item.id === itemId) {
        const isAssigned = item.assignedTo.includes(participantId);
        return {
          ...item,
          assignedTo: isAssigned
            ? item.assignedTo.filter((id) => id !== participantId)
            : [...item.assignedTo, participantId],
        };
      }
      return item;
    }));
  };

  const calculateSplit = () => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = parseRupiah(tax);
    const serviceAmount = parseRupiah(service);
    const tipAmount = parseRupiah(tip);
    const additionalCosts = taxAmount + serviceAmount + tipAmount;
    const additionalPerPerson = participants.length > 0 ? additionalCosts / participants.length : 0;

    const participantTotals: Record<string, number> = {};

    participants.forEach((p) => {
      participantTotals[p.id] = additionalPerPerson;
    });

    items.forEach((item) => {
      if (item.assignedTo.length > 0) {
        const pricePerPerson = (item.price * item.quantity) / item.assignedTo.length;
        item.assignedTo.forEach((pId) => {
          participantTotals[pId] = (participantTotals[pId] || 0) + pricePerPerson;
        });
      }
    });

    return {
      subtotal,
      tax: taxAmount,
      service: serviceAmount,
      tip: tipAmount,
      total: subtotal + additionalCosts,
      participantTotals,
    };
  };

  const handleSave = async () => {
    try {
      transactionSchema.parse({ title, description });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
      return;
    }

    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item!");
      return;
    }
    if (participants.length < 2) {
      toast.error("Tambahkan minimal 2 peserta!");
      return;
    }

    const unassignedItems = items.filter((item) => item.assignedTo.length === 0);
    if (unassignedItems.length > 0) {
      toast.error(`Item berikut belum diassign: ${unassignedItems.map((i) => i.name).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const calculation = calculateSplit();

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          title,
          description,
          total_amount: calculation.total,
          tax_amount: calculation.tax,
          service_amount: calculation.service,
          tip_amount: calculation.tip,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const { data: createdItems, error: itemsError } = await supabase
        .from("transaction_items")
        .insert(
          items.map((item) => ({
            transaction_id: transaction.id,
            item_name: item.name,
            item_price: item.price,
            quantity: item.quantity,
            category: item.category,
          }))
        )
        .select();

      if (itemsError) throw itemsError;

      const { data: createdParticipants, error: participantsError } = await supabase
        .from("transaction_participants")
        .insert(
          participants.map((p) => ({
            transaction_id: transaction.id,
            participant_name: p.name,
            total_amount: calculation.participantTotals[p.id] || 0,
          }))
        )
        .select();

      if (participantsError) throw participantsError;

      const assignments: any[] = [];
      items.forEach((item, index) => {
        const createdItem = createdItems[index];
        item.assignedTo.forEach((participantId) => {
          const participant = createdParticipants.find(
            (cp) => cp.participant_name === participants.find((p) => p.id === participantId)?.name
          );
          if (participant) {
            assignments.push({
              item_id: createdItem.id,
              participant_id: participant.id,
            });
          }
        });
      });

      const { error: assignmentsError } = await supabase
        .from("item_assignments")
        .insert(assignments);

      if (assignmentsError) throw assignmentsError;

      toast.success("Transaksi berhasil disimpan!");
      
      setTitle("");
      setDescription("");
      setItems([]);
      setParticipants([]);
      setTax("");
      setService("");
      setTip("");
      setStep(1);
    } catch (error: any) {
      console.error("Error saving transaction:", error);
      toast.error(error.message || "Gagal menyimpan transaksi");
      alert(error.message || "Gagal menyimpan transaksi");
    } finally {
      setLoading(false);
    }
  };

  const calculation = calculateSplit();

  const handleScannedItems = (scannedItems: any[]) => {
    const validatedItems: Item[] = scannedItems
      .map((item) => {
        try {
          const validated = itemSchema.parse({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            category: "Makanan",
          });
          return {
            id: Date.now().toString() + Math.random(),
            ...validated,
            assignedTo: [],
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is Item => item !== null);

    if (validatedItems.length > 0) {
      setItems([...items, ...validatedItems]);
      if (validatedItems.length < scannedItems.length) {
        toast.info(`${validatedItems.length} dari ${scannedItems.length} item berhasil ditambahkan`);
      } else {
        toast.success(`${validatedItems.length} item ditambahkan dari scan`);
      }
    } else {
      toast.error("Tidak ada item valid yang dapat ditambahkan");
    }
    setShowScanner(false);
  };

  const handleNextStep = () => {
    if (!title.trim()) {
      toast.error("Judul tidak boleh kosong!");
      return;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item!");
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Step Indicator - Simplified */}
        <div className="flex items-center justify-center gap-4 py-6">
          <div className={`flex items-center gap-3 ${step === 1 ? 'text-teal-500' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${step === 1 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <span className="text-sm font-medium">Informasi & Item</span>
          </div>
          <div className="w-20 h-px bg-gray-300" />
          <div className={`flex items-center gap-3 ${step === 2 ? 'text-teal-500' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${step === 2 ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <span className="text-sm font-medium">Biaya & Peserta</span>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Informasi Transaksi */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b bg-white">
                <CardTitle className="text-base font-semibold text-gray-800">Informasi Transaksi</CardTitle>
                <CardDescription className="text-xs text-gray-500">Detail tagihan yang akan dibagi</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 bg-white">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Judul *</Label>
                  <Input
                    placeholder="Makan di Restoran XYZ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Deskripsi</Label>
                  <Textarea
                    placeholder="Catatan tambahan..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] resize-none border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Item Pengeluaran */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-800">Item Pengeluaran</CardTitle>
                    <CardDescription className="text-xs text-gray-500 mt-1">Tambah item manual atau scan struk</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScanner(true)}
                    className="border-teal-500 text-teal-600 hover:bg-teal-50"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Scan Struk
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-5 bg-white">
                {/* Form Add Item */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Nama Item *</Label>
                    <Input
                      placeholder="Nasi Goreng"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Harga (Rp) *</Label>
                    <Input
                      placeholder="50000"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Jumlah</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Kategori</Label>
                    <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                      <SelectTrigger className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={addItem} className="w-full h-11 bg-teal-500 hover:bg-teal-600 text-white font-medium">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Item
                </Button>

                {/* List Items */}
                {items.length > 0 && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="text-sm font-medium text-gray-700 mb-3">Daftar Item ({items.length})</div>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-800">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                            <div>{formatRupiah(item.price)} × {item.quantity} = <span className="font-medium text-gray-700">{formatRupiah(item.price * item.quantity)}</span></div>
                          </div>
                          <Badge variant="secondary" className="mt-2 text-xs bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">
                            {item.category}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 ml-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-end">
              <Button onClick={handleNextStep} className="h-12 px-8 bg-teal-500 hover:bg-teal-600 text-white font-medium">
                Lanjut ke Step 2
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Biaya Tambahan */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b bg-white">
                <CardTitle className="text-base font-semibold text-gray-800">Biaya Tambahan</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Akan dibagi rata ke semua peserta
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Pajak (Rp)</Label>
                    <Input
                      placeholder="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Service (Rp)</Label>
                    <Input
                      placeholder="0"
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Tip (Rp)</Label>
                    <Input
                      placeholder="0"
                      value={tip}
                      onChange={(e) => setTip(e.target.value)}
                      className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peserta */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b bg-white">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Peserta
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Tambah 2-10 orang yang ikut patungan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4 bg-white">
                <div className="flex gap-3">
                  <Input
                    placeholder="Nama peserta"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                    className="h-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                  />
                  <Button onClick={addParticipant} className="h-10 bg-teal-500 hover:bg-teal-600 px-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {participants.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Daftar Peserta ({participants.length})</div>
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <span className="font-medium text-sm text-gray-800">{participant.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Assign Item */}
            {items.length > 0 && participants.length > 0 && (
              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="pb-4 border-b bg-white">
                  <CardTitle className="text-base font-semibold text-gray-800">Assign Item ke Peserta</CardTitle>
                  <CardDescription className="text-xs text-gray-500">
                    Centang item yang dipesan masing-masing orang
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 bg-white">
                  {items.map((item) => (
                    <div key={item.id} className="space-y-3 pb-5 border-b last:border-0">
                      <div className="font-medium text-sm text-gray-800">
                        {item.name} <span className="text-teal-600">({formatRupiah(item.price * item.quantity)})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {participants.map((participant) => (
                          <div key={participant.id} className="flex items-center space-x-2.5 p-2 rounded hover:bg-gray-50">
                            <Checkbox
                              id={`${item.id}-${participant.id}`}
                              checked={item.assignedTo.includes(participant.id)}
                              onCheckedChange={() => toggleAssignment(item.id, participant.id)}
                              className="border-gray-300"
                            />
                            <Label
                              htmlFor={`${item.id}-${participant.id}`}
                              className="text-sm cursor-pointer font-normal text-gray-700"
                            >
                              {participant.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {participants.length > 0 && (
              <Card className="border border-teal-200 shadow-sm bg-teal-50/50">
                <CardHeader className="pb-4 bg-white border-b">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                    <Calculator className="h-5 w-5 text-teal-500" />
                    Ringkasan Pembagian
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-6 bg-white">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal Item:</span>
                      <span className="font-medium text-gray-800">{formatRupiah(calculation.subtotal)}</span>
                    </div>
                    {calculation.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pajak:</span>
                        <span className="font-medium text-gray-800">{formatRupiah(calculation.tax)}</span>
                      </div>
                    )}
                    {calculation.service > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium text-gray-800">{formatRupiah(calculation.service)}</span>
                      </div>
                    )}
                    {calculation.tip > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tip:</span>
                        <span className="font-medium text-gray-800">{formatRupiah(calculation.tip)}</span>
                      </div>
                    )}
                    <Separator className="my-3" />
                    <div className="flex justify-between font-semibold text-base pt-1">
                      <span className="text-gray-800">Total:</span>
                      <span className="text-teal-600">{formatRupiah(calculation.total)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="font-medium text-sm text-gray-800">Pembagian per Orang:</div>
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <span className="font-medium text-sm text-gray-800">{participant.name}</span>
                        <span className="font-semibold text-teal-600 text-sm">
                          {formatRupiah(calculation.participantTotals[participant.id] || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Kembali
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || items.length === 0 || participants.length < 2}
                className="flex-1 h-12 bg-teal-500 hover:bg-teal-600 text-white font-medium"
              >
                {loading ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
            </div>
          </div>
        )}

        {showScanner && (
          <ReceiptScanner
            onClose={() => setShowScanner(false)}
            onScanComplete={handleScannedItems}
          />
        )}
      </div>
    </div>
  );
}