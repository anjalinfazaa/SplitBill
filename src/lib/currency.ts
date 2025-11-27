// Currency formatting utilities for Indonesian Rupiah

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const parseRupiah = (value: string): number => {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value);
};
