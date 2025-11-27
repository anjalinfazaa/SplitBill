import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/currency";
import { Calendar, Users, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Transaction {
  id: string;
  title: string;
  description: string | null;
  total_amount: number;
  tax_amount: number;
  service_amount: number;
  tip_amount: number;
  transaction_date: string;
  created_at: string;
}

interface TransactionDetail {
  items: any[];
  participants: any[];
  assignments: any[];
}

export default function TransactionHistory({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, TransactionDetail>>({});

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast.error("Gagal memuat riwayat");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    if (details[transactionId]) {
      setExpandedId(expandedId === transactionId ? null : transactionId);
      return;
    }

    try {
      const [itemsRes, participantsRes] = await Promise.all([
        supabase
          .from("transaction_items")
          .select("*")
          .eq("transaction_id", transactionId),
        supabase
          .from("transaction_participants")
          .select("*")
          .eq("transaction_id", transactionId),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (participantsRes.error) throw participantsRes.error;

      const itemIds = itemsRes.data.map((item) => item.id);
      const assignmentsRes = await supabase
        .from("item_assignments")
        .select("*")
        .in("item_id", itemIds);

      if (assignmentsRes.error) throw assignmentsRes.error;

      setDetails({
        ...details,
        [transactionId]: {
          items: itemsRes.data,
          participants: participantsRes.data,
          assignments: assignmentsRes.data,
        },
      });
      setExpandedId(transactionId);
    } catch (error: any) {
      console.error("Error fetching details:", error);
      toast.error("Gagal memuat detail");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Memuat riwayat...</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="shadow-medium">
        <CardContent className="text-center py-12">
          <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Belum ada transaksi</p>
          <p className="text-muted-foreground">
            Mulai bagi tagihan pertama Anda di tab "Bagi Tagihan"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">Riwayat Transaksi</h2>
        <Badge variant="secondary" className="text-xs sm:text-sm">{transactions.length} transaksi</Badge>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => {
          const isExpanded = expandedId === transaction.id;
          const detail = details[transaction.id];

          return (
            <Card key={transaction.id} className="shadow-medium">
              <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{transaction.title}</CardTitle>
                    {transaction.description && (
                      <CardDescription className="mt-1 text-xs sm:text-sm line-clamp-2">
                        {transaction.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-2xl font-bold text-primary whitespace-nowrap">
                      {formatRupiah(transaction.total_amount)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="truncate">{format(new Date(transaction.transaction_date), "dd MMM yyyy", {
                      locale: id,
                    })}</span>
                  </div>
                </div>

                {isExpanded && detail && (
                  <div className="space-y-4 mt-4 pt-4 border-t">
                    {/* Items */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Item ({detail.items.length})
                      </h4>
                      <div className="space-y-2">
                        {detail.items.map((item) => {
                          const itemAssignments = detail.assignments.filter(
                            (a) => a.item_id === item.id
                          );
                          const assignedParticipants = itemAssignments.map((a) =>
                            detail.participants.find((p) => p.id === a.participant_id)
                          );

                          return (
                            <div
                              key={item.id}
                              className="flex justify-between items-start p-2 rounded bg-accent/10"
                            >
                              <div>
                                <div className="font-medium">{item.item_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatRupiah(item.item_price)} × {item.quantity}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  {assignedParticipants.map((p) => (
                                    <Badge key={p.id} variant="outline" className="text-xs">
                                      {p.participant_name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="font-semibold">
                                {formatRupiah(item.item_price * item.quantity)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Participants */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Pembagian ({detail.participants.length} orang)
                      </h4>
                      <div className="space-y-2">
                        {detail.participants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex justify-between items-center p-3 rounded bg-primary/5"
                          >
                            <span className="font-medium">
                              {participant.participant_name}
                            </span>
                            <span className="font-bold text-primary">
                              {formatRupiah(participant.total_amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Costs */}
                    {(transaction.tax_amount > 0 ||
                      transaction.service_amount > 0 ||
                      transaction.tip_amount > 0) && (
                      <div className="text-sm text-muted-foreground space-y-1">
                        {transaction.tax_amount > 0 && (
                          <div className="flex justify-between">
                            <span>Pajak:</span>
                            <span>{formatRupiah(transaction.tax_amount)}</span>
                          </div>
                        )}
                        {transaction.service_amount > 0 && (
                          <div className="flex justify-between">
                            <span>Service:</span>
                            <span>{formatRupiah(transaction.service_amount)}</span>
                          </div>
                        )}
                        {transaction.tip_amount > 0 && (
                          <div className="flex justify-between">
                            <span>Tip:</span>
                            <span>{formatRupiah(transaction.tip_amount)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => fetchTransactionDetails(transaction.id)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Tutup Detail
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Lihat Detail
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
