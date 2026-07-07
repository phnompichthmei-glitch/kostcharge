export const formatCurrency = (amount, currency = 'IDR') => {
  // Always use $ symbol for all currencies
  return `$ ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
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
