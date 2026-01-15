
export const formatPKR = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatInputDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const validatePhone = (phone: string): boolean => {
  // Format: 03XX-XXXXXXX or 03XXXXXXXXX (11 digits total)
  const regex = /^03\d{9}$/;
  return regex.test(phone.replace(/-/g, ''));
};
