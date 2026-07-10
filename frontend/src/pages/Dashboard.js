import React, { useState, useEffect, useCallback } from 'react';
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

  const loadData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/dashboard/stats`, { withCredentials: true });
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setCurrency(data.default_currency || 'IDR');
      // Don't override language if user has manually selected one in localStorage
      const userSelectedLang = localStorage.getItem('appLanguage');
      if (data.default_language && !userSelectedLang) {
        i18n.changeLanguage(data.default_language);
        localStorage.setItem('appLanguage', data.default_language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, [i18n]);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [loadData, loadSettings]);

  useEffect(() => {
    if (socket) {
      socket.on('invoice_created', loadData);
      socket.on('invoice_updated', loadData);
      socket.on('invoice_status_changed', loadData);
      socket.on('invoice_deleted', loadData);
      
      return () => {
        socket.off('invoice_created');
        socket.off('invoice_updated');
        socket.off('invoice_status_changed');
        socket.off('invoice_deleted');
      };
    }
  }, [socket, loadData]);

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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-2">
          {t('dashboard')}
        </h1>
        <p className="text-sm sm:text-base text-slate-500">Boarding house billing management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.testId}
              data-testid={card.testId}
              className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 sm:p-6 transition-all duration-200 hover:shadow-md active:scale-98"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.color}`} strokeWidth={1.5} />
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-slate-950 mb-1">
                {card.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950">{t('recentInvoices')}</h2>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs sm:text-sm text-slate-600 hover:text-slate-950 font-medium transition-colors px-3 py-1.5 hover:bg-slate-50 rounded-sm"
          >
            View all
          </button>
        </div>
        
        {/* Mobile: Card View */}
        <div className="block sm:hidden">
          {stats?.recent_invoices?.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {stats.recent_invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="p-4 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-mono text-sm font-medium text-slate-950">
                      {invoice.serial_number}
                    </div>
                    <span className={`inline-block px-2 py-1 rounded-sm text-xs font-bold text-white ${getStatusColor(invoice.status)}`}>
                      {t(invoice.status)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 mb-1">
                    {invoice.tenant_name} - {invoice.room_number}
                  </div>
                  <div className="font-mono text-base font-bold text-slate-950">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              No invoices yet
            </div>
          )}
        </div>

        {/* Desktop/Tablet: Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-sm">
                  {t('serialNumber')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-sm">
                  {t('tenant')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-sm">
                  {t('total')}
                </th>
                <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-sm">
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
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono text-sm">
                      {invoice.serial_number}
                    </td>
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700 text-sm">
                      {invoice.tenant_name} - {invoice.room_number}
                    </td>
                    <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono text-sm">
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
