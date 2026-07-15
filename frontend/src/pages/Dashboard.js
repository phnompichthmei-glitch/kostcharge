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
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);

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

  const loadUpcomingInvoices = useCallback(async () => {
    try {
      // Fetch all invoices (not filtered by status)
      const { data } = await axios.get(`${API}/invoices`, { 
        withCredentials: true 
      });
      
      console.log('📊 Widget Debug - Total invoices fetched:', data.length);
      
      // Filter invoices with status 'pending' OR 'draft' and due within 15 days
      const today = new Date();
      const upcoming = data.filter(inv => {
        // Only include pending or draft invoices
        if (inv.status !== 'pending' && inv.status !== 'draft') return false;
        if (!inv.payment_due_day) {
          console.log(`⚠️ Invoice ${inv.serial_number} tidak punya payment_due_day`);
          return false;
        }
        
        const dueDate = new Date(inv.year, inv.month - 1, inv.payment_due_day);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const inRange = diffDays >= -15 && diffDays <= 15;
        
        console.log(`${inRange ? '✅' : '❌'} ${inv.serial_number} (${inv.status}) - Due: ${inv.payment_due_day}/${inv.month}/${inv.year} | Diff: ${diffDays} hari`);
        
        return inRange;
      }).sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, a.payment_due_day);
        const dateB = new Date(b.year, b.month - 1, b.payment_due_day);
        return dateA - dateB;
      }).slice(0, 5); // Top 5
      
      console.log(`🎯 Widget akan menampilkan ${upcoming.length} invoice`);
      setUpcomingInvoices(upcoming);
    } catch (error) {
      console.error('Error loading upcoming invoices:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadSettings();
    loadUpcomingInvoices();
  }, [loadData, loadSettings, loadUpcomingInvoices]);

  useEffect(() => {
    if (socket) {
      socket.on('invoice_created', () => {
        loadData();
        loadUpcomingInvoices();
      });
      socket.on('invoice_updated', () => {
        loadData();
        loadUpcomingInvoices();
      });
      socket.on('invoice_status_changed', () => {
        loadData();
        loadUpcomingInvoices();
      });
      socket.on('invoice_deleted', () => {
        loadData();
        loadUpcomingInvoices();
      });
      
      return () => {
        socket.off('invoice_created');
        socket.off('invoice_updated');
        socket.off('invoice_status_changed');
        socket.off('invoice_deleted');
      };
    }
  }, [socket, loadData, loadUpcomingInvoices]);

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

      {/* Upcoming Payments Widget */}
      <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            Upcoming Payments (15 Days)
          </h2>
          <button 
            onClick={() => navigate('/invoices')}
            className="text-sm text-blue-600 hover:underline"
          >
            View All
          </button>
        </div>

        {upcomingInvoices.length === 0 ? (
          <p className="text-slate-500 text-sm">No upcoming payments</p>
        ) : (
          <div className="space-y-3">
            {upcomingInvoices.map((invoice) => {
              const dueDate = new Date(invoice.year, invoice.month - 1, invoice.payment_due_day);
              const today = new Date();
              const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;
              const isDueSoon = diffDays >= 0 && diffDays <= 3;

              return (
                <div 
                  key={invoice.id}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-slate-50 transition-colors ${
                    isOverdue ? 'border-red-200 bg-red-50' : 
                    isDueSoon ? 'border-orange-200 bg-orange-50' : 
                    'border-slate-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {invoice.room_number}
                      </span>
                      <span className="text-sm text-slate-600">
                        {invoice.tenant_name}
                      </span>
                      {invoice.status === 'draft' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">
                          DRAFT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className={`font-mono ${
                        isOverdue ? 'text-red-700 font-bold' : 
                        isDueSoon ? 'text-orange-700 font-bold' : 
                        'text-slate-600'
                      }`}>
                        Due: {String(invoice.payment_due_day).padStart(2, '0')}/{String(invoice.month).padStart(2, '0')}/{invoice.year}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">
                          OVERDUE
                        </span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-bold">
                          {diffDays === 0 ? 'DUE TODAY' : `${diffDays}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
