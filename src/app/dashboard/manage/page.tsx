'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUserSettings, upsertUserSettings, uploadLogo } from '@/lib/settings-service';
import type { UserSettings } from '@/lib/settings-service';

const US_STATES = [
  { name: 'Alabama', code: 'AL', taxRate: 4.0 },
  { name: 'Alaska', code: 'AK', taxRate: 0.0 },
  { name: 'Arizona', code: 'AZ', taxRate: 5.6 },
  { name: 'Arkansas', code: 'AR', taxRate: 6.5 },
  { name: 'California', code: 'CA', taxRate: 7.25 },
  { name: 'Colorado', code: 'CO', taxRate: 2.9 },
  { name: 'Connecticut', code: 'CT', taxRate: 6.35 },
  { name: 'Delaware', code: 'DE', taxRate: 0.0 },
  { name: 'Florida', code: 'FL', taxRate: 6.0 },
  { name: 'Georgia', code: 'GA', taxRate: 4.0 },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    company_website: '',
    tax_rate: 0,
    tax_id: '',
    default_terms: '',
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      let data = await getUserSettings(user.id);
      
      // Si no hay settings, crear uno vacío
      if (!data) {
        data = await upsertUserSettings(user.id, {
          company_name: '',
          company_email: '',
          company_phone: '',
          company_address: '',
          company_website: '',
          tax_rate: 0,
          tax_id: '',
          default_terms: '',
        });
      }
      
      if (data) {
        setSettings(data);
        setFormData({
          company_name: data.company_name || '',
          company_email: data.company_email || '',
          company_phone: data.company_phone || '',
          company_address: data.company_address || '',
          company_website: data.company_website || '',
          tax_rate: data.tax_rate || 0,
          tax_id: data.tax_id || '',
          default_terms: data.default_terms || '',
        });
        if (data.company_logo) {
          setLogoPreview(data.company_logo);
        }
      }
    } catch (err: any) {
      console.error('Error loading settings:', err?.message || err);
      alert('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tax_rate' ? parseFloat(value) : value,
    }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      if (!user) return;
      const logoUrl = await uploadLogo(user.id, file);
      setLogoPreview(logoUrl);
      setSettings(prev => prev ? { ...prev, company_logo: logoUrl } : null);
      alert('Logo subido correctamente');
    } catch (err: any) {
      console.error('Error uploading logo:', err?.message || err);
      alert(`Error al subir logo: ${err?.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await upsertUserSettings(user.id, {
        ...formData,
        company_logo: logoPreview || undefined,
      });
      alert('Configuración guardada exitosamente');
      await loadSettings();
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Configuración de Empresa</h1>

        <div className="bg-white rounded-lg shadow divide-y">
          {/* Logo Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Logo de Empresa</h2>
            <div className="flex items-center space-x-6">
              {logoPreview && (
                <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={saving}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-sm text-gray-500 mt-2">PNG, JPG, máx 5MB</p>
              </div>
            </div>
          </div>

          {/* Company Info Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Información de Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Empresa
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu Negocio LLC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={formData.company_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="empresa@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="company_phone"
                  value={formData.company_phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://tuempresa.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  name="company_address"
                  value={formData.company_address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </div>
          </div>

          {/* Tax Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Información Fiscal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="7.25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID / EIN
                </label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="12-3456789"
                />
              </div>
            </div>
          </div>

          {/* Terms Section */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Términos por Defecto</h2>
            <textarea
              name="default_terms"
              value={formData.default_terms}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa los términos y condiciones por defecto que aparecerán en tus estimados e invoices..."
            />
          </div>

          {/* Save Button */}
          <div className="p-6 bg-gray-50">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
