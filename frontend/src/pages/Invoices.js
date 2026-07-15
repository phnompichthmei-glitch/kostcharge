import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { Plus, Search, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatCurrency, getStatusColor } from '../utils/helpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Invoices = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const socket = useSocket();
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]); // Store tenants for payment_due_day lookup
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTenants(); // Load tenants first
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadTenants = async () => {
    try {
      const { data } = await axios.get(`${API}/tenants`, { withCredentials: true });
      setTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on('invoice_created', () => loadInvoices());
      socket.on('invoice_updated', () => loadInvoices());
      socket.on('invoice_status_changed', () => loadInvoices());
      socket.on('invoice_deleted', () => loadInvoices());
      
      return () => {
        socket.off('invoice_created');
        socket.off('invoice_updated');
        socket.off('invoice_status_changed');
        socket.off('invoice_deleted');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const loadInvoices = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      
      const { data } = await axios.get(`${API}/invoices`, { params, withCredentials: true });
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadInvoices();
  };

  const downloadPDF = async (invoiceId, serialNumber) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        params: { lang: i18n.language },
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${serialNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading...</div></div>;
  }

  return (
    <div data-testid="invoices-page">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-2">{t('invoices')}</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage billing invoices</p>
        </div>
        <Button
          onClick={() => navigate('/invoices/create')}
          data-testid="create-invoice-btn"
          className="bg-slate-950 text-white hover:bg-slate-800 rounded-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('createInvoice')}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              placeholder={t('search')}
              data-testid="search-invoice-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" className="shrink-0">
              <Search className="w-4 h-4" />
            </Button>
          </form>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">{t('pending')}</SelectItem>
              <SelectItem value="paid">{t('paid')}</SelectItem>
              <SelectItem value="overdue">{t('overdue')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('serialNumber')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('tenant')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">Period</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-center">Meteran Awal</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-center">Meteran Akhir</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('total')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('status')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">{invoice.serial_number}</td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700">
                    {invoice.tenant_name} - {invoice.room_number}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">
                    {(() => {
                      // Try invoice.payment_due_day first, fallback to tenant's payment_due_day
                      let dueDay = invoice.payment_due_day;
                      if (!dueDay) {
                        const tenant = tenants.find(t => t.id === invoice.tenant_id);
                        dueDay = tenant?.payment_due_day;
                      }
                      return dueDay 
                        ? `${String(dueDay).padStart(2, '0')}/${String(invoice.month).padStart(2, '0')}/${invoice.year}`
                        : `${String(invoice.month).padStart(2, '0')}/${invoice.year}`;
                    })()}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-600 text-center font-mono text-sm">
                    {invoice.electricity_start != null ? invoice.electricity_start : '-'}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-600 text-center font-mono text-sm">
                    {invoice.electricity_end != null ? invoice.electricity_end : '-'}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-sm text-xs font-bold text-white ${getStatusColor(invoice.status)}`}>
                      {t(invoice.status)}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadPDF(invoice.id, invoice.serial_number); }}
                      data-testid={`download-pdf-${invoice.id}`}
                      className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">No invoices yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {invoices.length > 0 ? (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">{invoice.serial_number}</p>
                  <h3 className="font-bold text-slate-950 text-base mb-1">{invoice.tenant_name}</h3>
                  <p className="text-sm text-slate-600">Room {invoice.room_number}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-sm text-xs font-bold text-white ${getStatusColor(invoice.status)}`}>
                  {t(invoice.status)}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Period:</span>
                  <span className="text-slate-700 font-medium">{String(invoice.month).padStart(2, '0')}/{invoice.year}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Meteran Awal:</span>
                  <span className="text-slate-700 font-mono">{invoice.electricity_start != null ? invoice.electricity_start : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Meteran Akhir:</span>
                  <span className="text-slate-700 font-mono">{invoice.electricity_end != null ? invoice.electricity_end : '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('total')}:</span>
                  <span className="text-slate-950 font-mono font-bold">{formatCurrency(invoice.total, invoice.currency)}</span>
                </div>
              </div>
              <Button
                onClick={(e) => { e.stopPropagation(); downloadPDF(invoice.id, invoice.serial_number); }}
                data-testid={`download-pdf-${invoice.id}`}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 text-center text-slate-500">
            No invoices yet
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
