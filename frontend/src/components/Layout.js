import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, FileText, Settings as SettingsIcon, LogOut, Globe, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const Layout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/tenants', label: t('tenants'), icon: Users },
    { path: '/invoices', label: t('invoices'), icon: FileText },
    { path: '/settings', label: t('settings'), icon: SettingsIcon },
  ];

  const languages = [
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'km', name: 'ខ្មែរ' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('appLanguage', lng);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Desktop & Mobile Header */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_kostcharge/artifacts/mjhfiq2c_brand.png" 
                alt="Rent Room Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950">Rent Room</h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.path.replace('/', '')}`}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-sm hover:bg-slate-50 transition-colors">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={i18n.language === lang.code ? 'bg-slate-100' : ''}
                    >
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="text-sm text-slate-700">{user?.name}</div>
              
              <button
                onClick={handleLogout}
                data-testid="logout-btn"
                className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">{t('logout')}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-sm transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-200 pt-4">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-950 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Actions */}
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="px-4">
                  <div className="text-sm text-slate-500 mb-1">{t('language')}</div>
                  <select
                    value={i18n.language}
                    onChange={(e) => changeLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm bg-white text-sm"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-4 text-sm text-slate-700">
                  👤 {user?.name}
                </div>

                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center space-x-2 mx-4 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-sm font-medium hover:bg-red-100 transition-colors"
                  style={{ width: 'calc(100% - 2rem)' }}
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
