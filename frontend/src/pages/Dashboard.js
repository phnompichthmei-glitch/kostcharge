import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { Users, FileText, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { formatCurrency, getStatusColor } from '../utils/helpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('IDR');

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('invoice_created', () => loadData());
      socket.on('invoice_updated', () => loadData());
      socket.on('invoice_status_changed', () => loadData());
      socket.on('invoice_deleted', () => loadData());
      
      return () => {
        socket.off('invoice_created');
        socket.off('invoice_updated');
        socket.off('invoice_status_changed');
        socket.off('invoice_deleted');
      };
    }
  }, [socket]);

  const loadData = async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setCurrency(data.default_currency || 'IDR');
      if (data.default_language) {
        i18n.changeLanguage(data.default_language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      label: t('totalUncollected'),
      value: formatCurrency(stats?.total_uncollected || 0, currency),
      icon: TrendingUp,
      color: 'text-slate-950',
      testId: 'total-uncollected'
    },
    {
      label: t('totalTenants'),
      value: stats?.total_tenants || 0,
      icon: Users,
      color: 'text-slate-700',
      testId: 'total-tenants'
    },
    {
      label: t('pendingInvoices'),
      value: stats?.pending_invoices || 0,
      icon: Clock,
      color: 'text-yellow-600',
      testId: 'pending-invoices'
    },
    {
      label: t('overdueInvoices'),
      value: stats?.overdue_invoices || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      testId: 'overdue-invoices'
    },
  ];

  return (
    <div data-testid="dashboard-page">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-950 mb-2">
          {t('dashboard')}
        </h1>
        <p className="text-slate-500">Boarding house billing management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              data-testid={card.testId}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-4">
                <Icon className={`w-5 h-5 ${card.color}`} strokeWidth={1.5} />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-950 mb-1">
                {card.value}
              </div>
              <div className="text-sm text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-950">{t('recentInvoices')}</h2>
          <button
            onClick={() => navigate('/invoices')}
            className="text-sm text-slate-600 hover:text-slate-950 font-medium transition-colors"
          >
            View all
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">
                  {t('serialNumber')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">
                  {t('tenant')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">
                  {t('total')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">
                  {t('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_invoices?.length > 0 ? (
                stats.recent_invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">
                      {invoice.serial_number}
                    </td>
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700">
                      {invoice.tenant_name} - {invoice.room_number}
                    </td>
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="border-b border-slate-200 py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-sm text-xs font-bold text-white ${getStatusColor(invoice.status)}`}
                      >
                        {t(invoice.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-500">
                    No invoices yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
