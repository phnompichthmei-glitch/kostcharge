import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreateInvoice = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [settings, setSettings] = useState({ default_currency: 'IDR' });
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    payment_due_day: '',  // Tanggal jatuh tempo
    rent: '',
    electricity_start: '',
    electricity_end: '',
    electricity_rate: '',
    water_occupants: '1',
    water_price: '',
    deposit: '0',
    currency: 'IDR',
    notes: ''
  });
  const [selectedTenant, setSelectedTenant] = useState(null);

  useEffect(() => {
    loadTenants();
    loadSettings();
  }, []);

  useEffect(() => {
    if (formData.tenant_id) {
      const tenant = tenants.find(t => t.id === formData.tenant_id);
      if (tenant) {
        setSelectedTenant(tenant);
        setFormData(prev => ({
          ...prev,
          rent: tenant.rent_amount.toString(),
          electricity_rate: tenant.electricity_rate_per_kwh.toString(),
          water_price: tenant.water_price_per_month.toString(),
          water_occupants: tenant.occupants.toString(),
          payment_due_day: tenant.payment_due_day ? tenant.payment_due_day.toString() : ''  // Auto-fill dari tenant
        }));
      }
    }
  }, [formData.tenant_id, tenants]);

  const loadTenants = async () => {
    try {
      const { data } = await axios.get(`${API}/tenants`, { withCredentials: true });
      setTenants(data.filter(t => t.status === 'active'));
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    }
  };

  const loadSettings = async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings(data);
      setFormData(prev => ({ ...prev, currency: data.default_currency || 'IDR' }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const calculateTotal = () => {
    const rent = parseFloat(formData.rent) || 0;
    const elecUsage = (parseFloat(formData.electricity_end) || 0) - (parseFloat(formData.electricity_start) || 0);
    const elecCost = elecUsage * (parseFloat(formData.electricity_rate) || 0);
    const waterCost = (parseFloat(formData.water_price) || 0) * (parseInt(formData.water_occupants) || 1);
    const deposit = parseFloat(formData.deposit) || 0;
    return rent + elecCost + waterCost + deposit;
  };

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    
    if (loading) return;
    
    // Validate tenant_id is always required
    if (!formData.tenant_id) {
      toast.error('Please select a tenant');
      return;
    }
    
    // If not draft, validate all required fields
    if (!isDraft) {
      const requiredFields = ['rent', 'electricity_start', 'electricity_end', 'electricity_rate', 'water_occupants', 'water_price'];
      const missingFields = requiredFields.filter(field => !formData[field] || formData[field] === '');
      
      if (missingFields.length > 0) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const payload = {
        tenant_id: formData.tenant_id,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        rent: formData.rent ? parseFloat(formData.rent) : null,
        electricity_start: formData.electricity_start ? parseFloat(formData.electricity_start) : null,
        electricity_end: formData.electricity_end ? parseFloat(formData.electricity_end) : null,
        electricity_rate: formData.electricity_rate ? parseFloat(formData.electricity_rate) : null,
        water_occupants: formData.water_occupants ? parseInt(formData.water_occupants) : null,
        water_price: formData.water_price ? parseFloat(formData.water_price) : null,
        deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
        currency: formData.currency,
        notes: formData.notes,
        is_draft: isDraft
      };
      
      const { data } = await axios.post(`${API}/invoices`, payload, { withCredentials: true });
      
      if (isDraft) {
        toast.success('Draft saved successfully');
        navigate('/invoices');
      } else {
        toast.success('Invoice created successfully');
        navigate(`/invoices/${data.id}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.response?.data?.detail || `Failed to ${isDraft ? 'save draft' : 'create invoice'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="create-invoice-page" className="pb-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-2">{t('createInvoice')}</h1>
        <p className="text-sm sm:text-base text-slate-500">Generate a new billing invoice</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-950 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="tenant">{t('tenant')}</Label>
              <Select value={formData.tenant_id} onValueChange={(val) => setFormData({ ...formData, tenant_id: val })} required>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="month">{t('month')}</Label>
                <Select value={formData.month.toString()} onValueChange={(val) => setFormData({ ...formData, month: parseInt(val) })}>
                  <SelectTrigger data-testid="month-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">{t('year')}</Label>
                <Input
                  id="year"
                  type="number"
                  data-testid="year-input"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
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
                  data-testid="payment-due-day-input"
                  value={formData.payment_due_day}
                  onChange={(e) => setFormData({ ...formData, payment_due_day: e.target.value })}
                />
                <p className="text-xs text-slate-500 mt-1">Auto-fill dari tenant</p>
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
                required
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
                    required
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
                    required
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
                  required
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
                    required
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
                      required
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
                required
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
            onClick={() => navigate('/invoices')} 
            className="w-full sm:w-auto order-3 sm:order-1"
            disabled={loading}
          >
            {t('cancel')}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={(e) => handleSubmit(e, true)}
            data-testid="save-draft-btn" 
            className="w-full sm:w-auto order-2 sm:order-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            disabled={loading || !formData.tenant_id}
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button 
            type="submit" 
            data-testid="submit-invoice-btn" 
            className="bg-slate-950 text-white hover:bg-slate-800 w-full sm:w-auto order-1 sm:order-3"
            disabled={loading}
          >
            {loading ? 'Creating...' : t('createInvoice')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
