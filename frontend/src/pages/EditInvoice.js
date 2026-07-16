import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '../utils/helpers';
import { ArrowLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EditInvoice = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    tenant_id: '',
    month: '',
    year: '',
    payment_due_day: '',  // Tanggal jatuh tempo
    rent: '',
    electricity_start: '',
    electricity_end: '',
    electricity_rate: '',
    water_occupants: '',
    water_price: '',
    deposit: '',
    currency: 'IDR',
    notes: ''
  });

  useEffect(() => {
    loadTenants();
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-fill payment_due_day from tenant if invoice doesn't have it
  useEffect(() => {
    if (formData.tenant_id && tenants.length > 0 && !formData.payment_due_day) {
      const tenant = tenants.find(t => t.id === formData.tenant_id);
      if (tenant && tenant.payment_due_day) {
        setFormData(prev => ({
          ...prev,
          payment_due_day: tenant.payment_due_day.toString()
        }));
      }
    }
  }, [formData.tenant_id, tenants, formData.payment_due_day]);

  const loadTenants = async () => {
    try {
      const { data } = await axios.get(`${API}/tenants`, { withCredentials: true });
      setTenants(data.filter(t => t.status === 'active'));
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    }
  };

  const loadInvoice = async () => {
    try {
      const { data } = await axios.get(`${API}/invoices/${id}`, { withCredentials: true });
      
      if (data.status !== 'draft') {
        toast.error('Only draft invoices can be edited');
        navigate(`/invoices/${id}`);
        return;
      }

      setFormData({
        tenant_id: data.tenant_id,
        month: data.month,
        year: data.year,
        payment_due_day: data.payment_due_day ? data.payment_due_day.toString() : '',  // Load payment_due_day
        rent: data.rent !== null ? data.rent.toString() : '',
        electricity_start: data.electricity_start !== null ? data.electricity_start.toString() : '',
        electricity_end: data.electricity_end !== null ? data.electricity_end.toString() : '',
        electricity_rate: data.electricity_rate !== null ? data.electricity_rate.toString() : '',
        water_occupants: data.water_occupants !== null ? data.water_occupants.toString() : '',
        water_price: data.water_price !== null ? data.water_price.toString() : '',
        deposit: data.deposit !== null ? data.deposit.toString() : '0',
        currency: data.currency,
        notes: data.notes || ''
      });
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setInitialLoading(false);
    }
  };

  const calculateTotal = () => {
    const rent = parseFloat(formData.rent) || 0;
    const elecUsage = (parseFloat(formData.electricity_end) || 0) - (parseFloat(formData.electricity_start) || 0);
    const elecCost = elecUsage * (parseFloat(formData.electricity_rate) || 0);
    const waterCost = (parseFloat(formData.water_price) || 0) * (parseInt(formData.water_occupants) || 1);
    // Deposit is NOT included in total (separate line item)
    return rent + elecCost + waterCost;
  };

  const handleSubmit = async (e, finalize = false) => {
    e.preventDefault();
    
    if (loading) return;

    // If finalizing, validate all required fields
    if (finalize) {
      const requiredFields = ['rent', 'electricity_start', 'electricity_end', 'electricity_rate', 'water_occupants', 'water_price'];
      const missingFields = requiredFields.filter(field => !formData[field] || formData[field] === '');
      
      if (missingFields.length > 0) {
        toast.error('Please fill in all required fields to finalize invoice');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const payload = {
        rent: formData.rent ? parseFloat(formData.rent) : null,
        electricity_start: formData.electricity_start ? parseFloat(formData.electricity_start) : null,
        electricity_end: formData.electricity_end ? parseFloat(formData.electricity_end) : null,
        electricity_rate: formData.electricity_rate ? parseFloat(formData.electricity_rate) : null,
        water_occupants: formData.water_occupants ? parseInt(formData.water_occupants) : null,
        water_price: formData.water_price ? parseFloat(formData.water_price) : null,
        deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
        currency: formData.currency,
        notes: formData.notes,
        is_draft: !finalize
      };
      
      await axios.put(`${API}/invoices/${id}`, payload, { withCredentials: true });
      
      if (finalize) {
        toast.success('Invoice finalized successfully');
      } else {
        toast.success('Draft updated successfully');
      }
      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error(error.response?.data?.detail || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading...</div></div>;
  }

  return (
    <div data-testid="edit-invoice-page" className="pb-8">
      <button
        onClick={() => navigate(`/invoices/${id}`)}
        className="flex items-center space-x-2 text-slate-600 hover:text-slate-950 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to invoice</span>
      </button>

      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-2">Edit Draft Invoice</h1>
        <p className="text-sm sm:text-base text-slate-500">Update billing details or finalize invoice</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="max-w-4xl">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="tenant">{t('tenant')}</Label>
              <Select value={formData.tenant_id} onValueChange={(val) => setFormData({ ...formData, tenant_id: val })} disabled>
                <SelectTrigger data-testid="tenant-select">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} - Room {tenant.room_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Tenant cannot be changed</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="month">{t('month')}</Label>
                <Select 
                  value={formData.month.toString()} 
                  onValueChange={(val) => setFormData({ ...formData, month: parseInt(val) })}
                >
                  <SelectTrigger data-testid="month-select">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">{t('year')}</Label>
                <Input
                  id="year"
                  type="number"
                  min="2020"
                  max="2100"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || '' })}
                  placeholder="2026"
                />
              </div>
              <div>
                <Label htmlFor="payment_due_day">Jatuh Tempo (1-31)</Label>
                <Input
                  id="payment_due_day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Contoh: 5, 10, 15"
                  value={formData.payment_due_day}
                  onChange={(e) => setFormData({ ...formData, payment_due_day: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Optional, bisa diisi manual</p>
              </div>
            </div>

            <div>
              <Label htmlFor="currency">{t('currency')}</Label>
              <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                <SelectTrigger data-testid="currency-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Rupiah</SelectItem>
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                  <SelectItem value="CNY">CNY - Yuan</SelectItem>
                  <SelectItem value="KHR">KHR - Riel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950 mb-4">Billing Components</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rent">{t('rent')}</Label>
              <Input
                id="rent"
                type="number"
                step="0.01"
                data-testid="rent-input"
                value={formData.rent}
                onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
              />
            </div>

            <div>
              <Label className="block mb-2">Listrik</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="elec_start" className="text-sm text-slate-600">{t('electricityStart')}</Label>
                  <Input
                    id="elec_start"
                    type="number"
                    step="0.01"
                    data-testid="electricity-start-input"
                    value={formData.electricity_start}
                    onChange={(e) => setFormData({ ...formData, electricity_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="elec_end" className="text-sm text-slate-600">{t('electricityEnd')}</Label>
                  <Input
                    id="elec_end"
                    type="number"
                    step="0.01"
                    data-testid="electricity-end-input"
                    value={formData.electricity_end}
                    onChange={(e) => setFormData({ ...formData, electricity_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="elec_rate">{t('electricityRate')}</Label>
              <div className="relative">
                <Input
                  id="elec_rate"
                  type="number"
                  step="0.01"
                  data-testid="electricity-rate-input"
                  value={formData.electricity_rate}
                  onChange={(e) => setFormData({ ...formData, electricity_rate: e.target.value })}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
              </div>
            </div>

            <div>
              <Label className="block mb-2">Air</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="water_occupants" className="text-sm text-slate-600">{t('occupants')}</Label>
                  <Input
                    id="water_occupants"
                    type="number"
                    data-testid="water-occupants-input"
                    value={formData.water_occupants}
                    onChange={(e) => setFormData({ ...formData, water_occupants: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="water_price" className="text-sm text-slate-600">{t('waterPrice')}</Label>
                  <div className="relative">
                    <Input
                      id="water_price"
                      type="number"
                      step="0.01"
                      data-testid="water-price-input"
                      value={formData.water_price}
                      onChange={(e) => setFormData({ ...formData, water_price: e.target.value })}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="deposit">{t('deposit')}</Label>
              <Input
                id="deposit"
                type="number"
                step="0.01"
                data-testid="deposit-input"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                data-testid="notes-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-950">Total</h2>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950" data-testid="invoice-total">
              {formatCurrency(calculateTotal(), formData.currency)}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4 sm:gap-0">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(`/invoices/${id}`)} 
            className="w-full sm:w-auto order-3 sm:order-1"
            disabled={loading}
          >
            {t('cancel')}
          </Button>
          <Button 
            type="submit" 
            variant="outline"
            data-testid="update-draft-btn" 
            className="w-full sm:w-auto order-2 sm:order-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Draft'}
          </Button>
          <Button 
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            data-testid="finalize-invoice-btn" 
            className="bg-slate-950 text-white hover:bg-slate-800 w-full sm:w-auto order-1 sm:order-3"
            disabled={loading}
          >
            {loading ? 'Finalizing...' : 'Finalize Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditInvoice;
