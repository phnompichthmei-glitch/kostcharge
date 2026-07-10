import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Download, ArrowLeft, CheckCircle } from 'lucide-react';
import { formatCurrency, getStatusColor, getMonthName } from '../utils/helpers';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InvoiceDetail = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      const { data } = await axios.get(`${API}/invoices/${id}`, { withCredentials: true });
      setInvoice(data);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    try {
      await axios.post(`${API}/invoices/${id}/mark-paid`, {}, { withCredentials: true });
      toast.success('Invoice marked as paid');
      loadInvoice();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to update invoice');
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(`${API}/invoices/${id}/pdf`, {
        params: { lang: i18n.language },
        withCredentials: true,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.serial_number}.pdf`);
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

  if (!invoice) {
    return <div className="text-center py-8">Invoice not found</div>;
  }

  return (
    <div data-testid="invoice-detail-page">
      <button
        onClick={() => navigate('/invoices')}
        className="flex items-center space-x-2 text-slate-600 hover:text-slate-950 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to invoices</span>
      </button>

      <div className="max-w-4xl">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 mb-2">INVOICE</h1>
              <div className="font-mono text-lg text-slate-700">{invoice.serial_number}</div>
            </div>
            <div className="text-right">
              <span className={`inline-block px-4 py-2 rounded-sm text-sm font-bold text-white ${getStatusColor(invoice.status)}`}>
                {t(invoice.status).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-sm text-slate-500 mb-1">Tenant</div>
              <div className="font-bold text-slate-950">{invoice.tenant_name}</div>
              <div className="text-slate-700">Room {invoice.room_number}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1">Period</div>
              <div className="font-bold text-slate-950">
                {getMonthName(invoice.month, i18n.language)} {invoice.year}
              </div>
              <div className="text-slate-700">
                {new Date(invoice.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="border-t border-b border-slate-200 py-6 mb-6">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-slate-700">{t('rent')}</td>
                  <td className="py-3 text-slate-500">-</td>
                  <td className="py-3 text-right text-slate-950">
                    {invoice.rent !== null ? formatCurrency(invoice.rent, invoice.currency) : '-'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-slate-700">{t('electricity')}</td>
                  <td className="py-3 text-slate-500">
                    {invoice.electricity_start !== null && invoice.electricity_end !== null && invoice.electricity_rate !== null
                      ? `${invoice.electricity_start} → ${invoice.electricity_end} kWh × $ ${invoice.electricity_rate}`
                      : '-'}
                  </td>
                  <td className="py-3 text-right text-slate-950">
                    {invoice.electricity_cost ? formatCurrency(invoice.electricity_cost, invoice.currency) : '-'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-slate-700">{t('water')}</td>
                  <td className="py-3 text-slate-500">
                    {invoice.water_occupants !== null && invoice.water_price !== null
                      ? `${invoice.water_occupants} occupants × $ ${invoice.water_price}`
                      : '-'}
                  </td>
                  <td className="py-3 text-right text-slate-950">
                    {invoice.water_cost ? formatCurrency(invoice.water_cost, invoice.currency) : '-'}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="py-3 text-slate-700">{t('deposit')}</td>
                  <td className="py-3 text-slate-500">-</td>
                  <td className="py-3 text-right text-slate-950">
                    {invoice.deposit !== null ? formatCurrency(invoice.deposit, invoice.currency) : '-'}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-4 text-slate-950 font-bold" colSpan="2">TOTAL</td>
                  <td className="py-4 text-right text-slate-950 font-bold text-xl">
                    {formatCurrency(invoice.total || 0, invoice.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {invoice.notes && (
            <div className="mb-6">
              <div className="text-sm text-slate-500 mb-1">Notes</div>
              <div className="text-slate-700">{invoice.notes}</div>
            </div>
          )}

          <div className="flex space-x-4">
            {invoice.status === 'draft' ? (
              <>
                <Button
                  onClick={() => navigate(`/invoices/edit/${id}`)}
                  data-testid="edit-draft-btn"
                  className="bg-blue-600 text-white hover:bg-blue-700 rounded-sm"
                >
                  Edit Draft
                </Button>
                <Button
                  onClick={downloadPDF}
                  data-testid="download-pdf-btn"
                  variant="outline"
                  className="border-slate-200 rounded-sm"
                  disabled
                  title="PDF cannot be generated for drafts"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('downloadPDF')} (Draft)
                </Button>
              </>
            ) : (
              <>
                {invoice.status !== 'paid' && (
                  <Button
                    onClick={markAsPaid}
                    data-testid="mark-paid-btn"
                    className="bg-green-600 text-white hover:bg-green-700 rounded-sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('markAsPaid')}
                  </Button>
                )}
                <Button
                  onClick={downloadPDF}
                  data-testid="download-pdf-btn"
                  variant="outline"
                  className="border-slate-200 rounded-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('downloadPDF')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
