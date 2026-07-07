import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const Login = () => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = isLogin
        ? await login(formData.email, formData.password)
        : await register(formData.email, formData.password, formData.name);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.pexels.com/photos/11346374/pexels-photo-11346374.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Building"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 mb-2">
              KostCharge
            </h1>
            <p className="text-slate-500">
              {isLogin ? t('login') : t('register')} {t('dashboard').toLowerCase()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-slate-900">{t('name')}</Label>
                <Input
                  id="name"
                  type="text"
                  data-testid="name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 border-slate-200 rounded-sm focus:ring-slate-950"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-900">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                data-testid="email-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 border-slate-200 rounded-sm focus:ring-slate-950"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-900">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                data-testid="password-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 border-slate-200 rounded-sm focus:ring-slate-950"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              data-testid="submit-auth-btn"
              disabled={loading}
              className="w-full bg-slate-950 text-white hover:bg-slate-800 rounded-sm font-medium transition-colors duration-200"
            >
              {loading ? '...' : isLogin ? t('login') : t('register')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-600 hover:text-slate-950 transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
