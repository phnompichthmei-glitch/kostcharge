export const formatCurrency = (amount, currency = 'IDR') => {
  const formats = {
    IDR: { symbol: 'Rp', locale: 'id-ID' },
    USD: { symbol: '$', locale: 'en-US' },
    CNY: { symbol: '¥', locale: 'zh-CN' },
    KHR: { symbol: '៛', locale: 'km-KH' }
  };

  const format = formats[currency] || formats.IDR;
  return new Intl.NumberFormat(format.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const getMonthName = (month, language = 'id') => {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString(language === 'id' ? 'id-ID' : language === 'zh' ? 'zh-CN' : language === 'km' ? 'km-KH' : 'en-US', { month: 'long' });
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'paid':
      return 'bg-green-600';
    case 'pending':
      return 'bg-yellow-600';
    case 'overdue':
      return 'bg-red-600';
    default:
      return 'bg-slate-600';
  }
};
