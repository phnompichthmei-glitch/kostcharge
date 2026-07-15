import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Tenants = () => {
  const { t } = useTranslation();
  const socket = useSocket();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    room_number: '',
    contact: '',
    rent_amount: '',
    water_price_per_month: '',
    electricity_rate_per_kwh: '',
    occupants: '1',
    status: 'active',
    payment_due_day: ''  // Payment due day (1-31)
  });

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('tenant_created', (data) => {
        setTenants((prev) => [data, ...prev]);
        toast.success('Tenant added');
      });
      socket.on('tenant_updated', (data) => {
        setTenants((prev) => prev.map((t) => (t.id === data.id ? data : t)));
        toast.success('Tenant updated');
      });
      socket.on('tenant_deleted', (data) => {
        setTenants((prev) => prev.filter((t) => t.id !== data.id));
        toast.success('Tenant deleted');
      });
      
      return () => {
        socket.off('tenant_created');
        socket.off('tenant_updated');
        socket.off('tenant_deleted');
      };
    }
  }, [socket]);

  const loadTenants = async () => {
    try {
      const { data } = await axios.get(`${API}/tenants`, { withCredentials: true });
      setTenants(data);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await axios.put(`${API}/tenants/${editingTenant.id}`, formData, { withCredentials: true });
      } else {
        await axios.post(`${API}/tenants`, formData, { withCredentials: true });
      }
      setShowDialog(false);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Failed to save tenant');
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      room_number: tenant.room_number,
      contact: tenant.contact,
      rent_amount: tenant.rent_amount.toString(),
      water_price_per_month: tenant.water_price_per_month.toString(),
      electricity_rate_per_kwh: tenant.electricity_rate_per_kwh.toString(),
      occupants: tenant.occupants.toString(),
      status: tenant.status,
      payment_due_day: tenant.payment_due_day ? tenant.payment_due_day.toString() : ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        await axios.delete(`${API}/tenants/${id}`, { withCredentials: true });
        loadTenants();
      } catch (error) {
        console.error('Error deleting tenant:', error);
        toast.error('Failed to delete tenant');
      }
    }
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      name: '',
      room_number: '',
      contact: '',
      rent_amount: '',
      water_price_per_month: '',
      electricity_rate_per_kwh: '',
      occupants: '1',
      status: 'active',
      payment_due_day: ''
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading...</div></div>;
  }

  return (
    <div data-testid="tenants-page">
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-2">{t('tenants')}</h1>
          <p className="text-sm sm:text-base text-slate-500">Manage boarding house tenants</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowDialog(true); }}
          data-testid="add-tenant-btn"
          className="bg-slate-950 text-white hover:bg-slate-800 rounded-sm w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('addTenant')}
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('name')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('roomNumber')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('contact')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('rentAmount')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50 text-center">Jatuh Tempo</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('status')}</th>
              <th className="border-b border-slate-200 py-3 px-4 font-bold text-slate-900 bg-slate-50">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length > 0 ? (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700">{tenant.name}</td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">{tenant.room_number}</td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700">{tenant.contact}</td>
                  <td className="border-b border-slate-200 py-3 px-4 text-slate-700 font-mono">{tenant.rent_amount}</td>
                  <td className="border-b border-slate-200 py-3 px-4 text-center">
                    {tenant.payment_due_day ? (
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-sm text-xs font-mono font-bold">
                        Tgl {tenant.payment_due_day}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-sm text-xs font-bold ${tenant.status === 'active' ? 'bg-green-600 text-white' : 'bg-slate-400 text-white'}`}>
                      {t(tenant.status)}
                    </span>
                  </td>
                  <td className="border-b border-slate-200 py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(tenant)}
                        data-testid={`edit-tenant-${tenant.id}`}
                        className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                      >
                        <Edit className="w-4 h-4 text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(tenant.id)}
                        data-testid={`delete-tenant-${tenant.id}`}
                        className="p-2 hover:bg-red-50 rounded-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-8 text-center text-slate-500">No tenants yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {tenants.length > 0 ? (
          tenants.map((tenant) => (
            <div key={tenant.id} className="bg-white border border-slate-200 rounded-sm shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-950 text-lg mb-1">{tenant.name}</h3>
                  <p className="text-sm text-slate-600">Room {tenant.room_number}</p>
                </div>
                <span className={`inline-block px-3 py-1 rounded-sm text-xs font-bold ${tenant.status === 'active' ? 'bg-green-600 text-white' : 'bg-slate-400 text-white'}`}>
                  {t(tenant.status)}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('contact')}:</span>
                  <span className="text-slate-700 font-medium">{tenant.contact}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('rentAmount')}:</span>
                  <span className="text-slate-700 font-mono font-medium">${tenant.rent_amount}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleEdit(tenant)}
                  data-testid={`edit-tenant-${tenant.id}`}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('edit')}
                </Button>
                <Button
                  onClick={() => handleDelete(tenant.id)}
                  data-testid={`delete-tenant-${tenant.id}`}
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('delete')}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-8 text-center text-slate-500">
            No tenants yet
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTenant ? t('edit') : t('addTenant')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                data-testid="tenant-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="room_number">{t('roomNumber')}</Label>
              <Input
                id="room_number"
                data-testid="tenant-room-input"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact">{t('contact')}</Label>
              <Input
                id="contact"
                data-testid="tenant-contact-input"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="rent_amount">{t('rentAmount')}</Label>
              <Input
                id="rent_amount"
                type="number"
                data-testid="tenant-rent-input"
                value={formData.rent_amount}
                onChange={(e) => setFormData({ ...formData, rent_amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="water_price">{t('waterPrice')}</Label>
              <Input
                id="water_price"
                type="number"
                data-testid="tenant-water-input"
                value={formData.water_price_per_month}
                onChange={(e) => setFormData({ ...formData, water_price_per_month: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="electricity_rate">{t('electricityRate')}</Label>
              <Input
                id="electricity_rate"
                type="number"
                step="0.01"
                data-testid="tenant-electricity-input"
                value={formData.electricity_rate_per_kwh}
                onChange={(e) => setFormData({ ...formData, electricity_rate_per_kwh: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="occupants">{t('occupants')}</Label>
              <Input
                id="occupants"
                type="number"
                data-testid="tenant-occupants-input"
                value={formData.occupants}
                onChange={(e) => setFormData({ ...formData, occupants: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="payment_due_day">Tanggal Jatuh Tempo (1-31)</Label>
              <Input
                id="payment_due_day"
                type="number"
                min="1"
                max="31"
                placeholder="Contoh: 5, 10, 15"
                data-testid="tenant-due-day-input"
                value={formData.payment_due_day}
                onChange={(e) => setFormData({ ...formData, payment_due_day: e.target.value })}
              />
              <p className="text-xs text-slate-500 mt-1">Tanggal setiap bulan untuk pembayaran sewa</p>
            </div>
            <div>
              <Label htmlFor="status">{t('status')}</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger data-testid="tenant-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end space-x-2 mt-4">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                {t('cancel')}
              </Button>
              <Button type="submit" data-testid="save-tenant-btn" className="bg-slate-950 text-white hover:bg-slate-800">
                {t('save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tenants;
