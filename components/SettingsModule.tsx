import React, { useState, useRef, useMemo } from 'react';
import { AppSettings, User, UserRole } from '../types';
import { Save, RefreshCw, AlertTriangle, Building, Globe, Calendar, Users, Plus, Trash2, Edit2, X, Languages, Database, Download, Upload, Bell, Search } from 'lucide-react';
import { storageService } from '../services/storageService';
import { translations } from '../utils/translations';
import { notificationService } from '../services/notificationService';

interface SettingsProps {
  settings: AppSettings;
  currentUser: User;
  allUsers: User[];
  onSave: (settings: AppSettings) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  language: 'en' | 'ar';
}

const SettingsModule: React.FC<SettingsProps> = ({ settings, currentUser, allUsers, onSave, onAddUser, onUpdateUser, onDeleteUser, language }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User Filter State
  const [userSearch, setUserSearch] = useState('');
  const [filterRole, setFilterRole] = useState('All');

  // User Form State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
      name: '',
      email: '',
      password: '',
      role: UserRole.SALES_REP
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If notifications are enabled, request permission
    if (formData.enableNotifications) {
        const granted = await notificationService.requestPermission();
        if (!granted) {
            alert("Browser notifications permission denied. Alerts will show in-app only.");
        }
    }

    onSave(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isEditing) {
          // Update existing user
          onUpdateUser({
              id: isEditing,
              name: userForm.name,
              email: userForm.email,
              password: userForm.password,
              role: userForm.role
          });
          setIsEditing(null);
      } else {
          // Create new user
          onAddUser({
              id: Date.now().toString(),
              name: userForm.name,
              email: userForm.email,
              password: userForm.password,
              role: userForm.role
          });
      }
      // Reset form
      setUserForm({ name: '', email: '', password: '', role: UserRole.SALES_REP });
  };

  const handleEditClick = (user: User) => {
      setIsEditing(user.id);
      setUserForm({
          name: user.name,
          email: user.email,
          password: user.password || '',
          role: user.role
      });
  };

  const handleCancelEdit = () => {
      setIsEditing(null);
      setUserForm({ name: '', email: '', password: '', role: UserRole.SALES_REP });
  };

  const handleFactoryReset = () => {
      if (confirm(t.common.confirm)) {
          storageService.factoryReset();
      }
  };

  const handleDownloadBackup = () => {
      const data = storageService.createBackup();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (confirm(t.settings.restoreWarning)) {
              const success = storageService.restoreBackup(content);
              if (success) {
                  alert("Restore successful! The application will now reload.");
                  window.location.reload();
              } else {
                  alert("Failed to restore backup. Invalid file format.");
              }
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter Logic
  const filteredUsers = useMemo(() => {
      return allUsers.filter(u => {
          const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                                u.email.toLowerCase().includes(userSearch.toLowerCase());
          const matchesRole = filterRole === 'All' || u.role === filterRole;
          return matchesSearch && matchesRole;
      });
  }, [allUsers, userSearch, filterRole]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{t.settings.title}</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('general')}
            className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Building className="w-4 h-4" /> {t.settings.general}
        </button>
        {currentUser.role === UserRole.ADMIN && (
            <button 
                onClick={() => setActiveTab('users')}
                className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Users className="w-4 h-4" /> {t.settings.users}
            </button>
        )}
      </div>

      {activeTab === 'general' && (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    {t.settings.companyProfile}
                </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t.settings.companyName}</label>
                        <div className="relative">
                            <Building className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                required
                                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.companyName}
                                onChange={e => setFormData({...formData, companyName: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t.settings.currency}</label>
                        <div className="relative">
                            <Globe className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                            <select 
                                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.currency}
                                onChange={e => setFormData({...formData, currency: e.target.value})}
                            >
                                <option value="$">USD ($)</option>
                                <option value="EGP">EGP (LE)</option>
                                <option value="SAR">SAR (SR)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t.settings.fiscalYear}</label>
                        <div className="relative">
                            <Calendar className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                            <select 
                                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.fiscalYearStart}
                                onChange={e => setFormData({...formData, fiscalYearStart: e.target.value})}
                            >
                                <option value="January">January</option>
                                <option value="April">April</option>
                                <option value="July">July</option>
                                <option value="October">October</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t.settings.language}</label>
                        <div className="relative">
                            <Languages className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
                            <select 
                                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.language}
                                onChange={e => setFormData({...formData, language: e.target.value as 'en' | 'ar'})}
                            >
                                <option value="en">English (US)</option>
                                <option value="ar">Arabic (العربية)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t.settings.theme}</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="theme"
                                    value="light"
                                    checked={formData.theme === 'light'}
                                    onChange={() => setFormData({...formData, theme: 'light'})}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700">Light Mode</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer opacity-50">
                                <input 
                                    type="radio" 
                                    name="theme"
                                    value="dark"
                                    disabled
                                    className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-400">Dark Mode (Pro)</span>
                            </label>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">{t.common.notifications}</label>
                         <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={formData.enableNotifications || false}
                                    onChange={(e) => setFormData({...formData, enableNotifications: e.target.checked})}
                                    className="text-indigo-600 focus:ring-indigo-500 w-5 h-5 rounded"
                                />
                                <Bell className="w-5 h-5 text-slate-500" />
                                <span className="text-sm text-slate-700">{t.settings.enableNotifications}</span>
                         </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className={`text-sm font-medium text-emerald-600 transition-opacity ${isSaved ? 'opacity-100' : 'opacity-0'}`}>
                        {t.common.save}
                    </span>
                    <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                    >
                        <Save className="w-4 h-4" /> {t.settings.save}
                    </button>
                </div>
            </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-blue-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-blue-700">
                    <Database className="w-5 h-5" />
                    {t.settings.dataManagement}
                </h3>
            </div>
            <div className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-medium text-slate-800">{t.settings.downloadBackup}</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                            Save all your system data to a JSON file.
                        </p>
                    </div>
                    <button 
                        onClick={handleDownloadBackup}
                        className="bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <Download className="w-4 h-4" /> {t.common.export} Backup
                    </button>
                </div>
                
                <div className="border-t border-slate-100 my-6"></div>

                 <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-medium text-slate-800">{t.settings.restoreBackup}</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                            Restore system data from a backup file.
                        </p>
                    </div>
                    <div>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleRestoreFile} 
                            className="hidden" 
                            accept=".json"
                        />
                        <button 
                            onClick={handleRestoreClick}
                            className="bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Upload className="w-4 h-4" /> {t.settings.restoreBackup}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-red-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    {t.settings.dangerZone}
                </h3>
            </div>
            <div className="p-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-medium text-slate-800">{t.settings.factoryReset}</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                            Permanently delete all data.
                        </p>
                    </div>
                    <button 
                        onClick={handleFactoryReset}
                        className="bg-white border-2 border-red-100 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> {t.settings.resetSystem}
                    </button>
                </div>
            </div>
        </div>
      </>
      )}

      {activeTab === 'users' && currentUser.role === UserRole.ADMIN && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        {t.settings.users}
                    </h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:rtl:divide-x-reverse divide-slate-200">
                {/* Add/Edit User Form */}
                <div className="p-6 lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-800">{isEditing ? t.common.edit : t.common.add}</h4>
                        {isEditing && (
                            <button onClick={handleCancelEdit} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                                <X className="w-3 h-3"/> {t.common.cancel}
                            </button>
                        )}
                    </div>
                    
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                        <div className={`p-4 rounded-lg border ${isEditing ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">{t.common.fullName}</label>
                                <input 
                                    required 
                                    type="text"
                                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={userForm.name}
                                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                                />
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">{t.common.email}</label>
                                <input 
                                    required 
                                    type="email"
                                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={userForm.email}
                                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                                />
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">{t.login.password}</label>
                                <input 
                                    required 
                                    type="text"
                                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={userForm.password}
                                    onChange={e => setUserForm({...userForm, password: e.target.value})}
                                />
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-medium text-slate-700 mb-1">{t.common.role}</label>
                                <select 
                                    className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={userForm.role}
                                    onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                                >
                                    {Object.values(UserRole).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <button 
                                type="submit"
                                className={`w-full mt-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {isEditing ? <><Save className="w-4 h-4" /> {t.common.save}</> : <><Plus className="w-4 h-4" /> {t.common.add}</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* User List */}
                <div className="p-6 lg:col-span-2 bg-slate-50/30">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h4 className="font-bold text-slate-800">{t.settings.users}</h4>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute start-2 top-2.5 w-3 h-3 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder={t.common.search}
                                    className="w-full sm:w-40 ps-7 pe-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                            </div>
                            <select 
                                className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="All">All Roles</option>
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                     </div>

                     <div className="space-y-3">
                        {filteredUsers.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">No users found.</p>
                        ) : (
                            filteredUsers.map(user => (
                                <div key={user.id} className={`bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm ${isEditing === user.id ? 'border-amber-400 ring-1 ring-amber-400' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{user.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">{user.email}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{user.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleEditClick(user)}
                                            className="text-slate-400 hover:text-amber-500 p-2 hover:bg-amber-50 rounded"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {user.id !== currentUser.id && (
                                            <button 
                                                onClick={() => onDeleteUser(user.id)}
                                                className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default SettingsModule;