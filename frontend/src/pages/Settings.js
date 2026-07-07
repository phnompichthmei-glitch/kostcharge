import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Settings = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState({
    default_currency: 'IDR',
    default_language: 'id'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings(data);
      if (data.default_language) {
        i18n.changeLanguage(data.default_language);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API}/settings`, settings, { withCredentials: true });
      i18n.changeLanguage(settings.default_language);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-slate-500">Loading...</div></div>;
  }

  return (
    <div data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-slate-950 mb-2">{t('settings')}</h1>
        <p className="text-slate-500">Application preferences</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="currency">{t('defaultCurrency')}</Label>
              <Select
                value={settings.default_currency}
                onValueChange={(val) => setSettings({ ...settings, default_currency: val })}
              >
                <SelectTrigger data-testid="currency-setting" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="KHR">KHR - Cambodian Riel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language">{t('defaultLanguage')}</Label>
              <Select
                value={settings.default_language}
                onValueChange={(val) => setSettings({ ...settings, default_language: val })}
              >
                <SelectTrigger data-testid="language-setting" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文 (Chinese)</SelectItem>
                  <SelectItem value="km">ខ្មែរ (Khmer)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                data-testid="save-settings-btn"
                className="bg-slate-950 text-white hover:bg-slate-800 rounded-sm"
              >
                {t('save')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
