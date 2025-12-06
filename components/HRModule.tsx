import React, { useState, useRef, useMemo } from 'react';
import { Employee } from '../types';
import { UserPlus, Mail, Phone, Trash2, X, Download, Upload, Search } from 'lucide-react';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { translations } from '../utils/translations';

interface HRProps {
  employees: Employee[];
  onAdd: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onImport: (data: Employee[]) => void;
  language: 'en' | 'ar';
}

const HRModule: React.FC<HRProps> = ({ employees, onAdd, onDelete, onImport, language }) => {
  const t = translations[language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const [formData, setFormData] = useState({
      name: '',
      role: '',
      department: '',
      salary: '',
      status: 'Active'
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newEmp: Employee = {
          id: Date.now().toString(),
          name: formData.name,
          role: formData.role,
          department: formData.department,
          salary: parseInt(formData.salary) || 0,
          status: formData.status as any,
          joinDate: new Date().toLocaleDateString()
      };
      onAdd(newEmp);
      setIsModalOpen(false);
      setFormData({ name: '', role: '', department: '', salary: '', status: 'Active' });
  };

  const handleExport = () => {
      exportToExcel(employees, 'HR_Employees');
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const data = await importFromExcel(file);
              onImport(data);
          } catch (error) {
              alert('Error importing file.');
          }
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filter Logic
  const uniqueDepartments = useMemo(() => Array.from(new Set(employees.map(e => e.department))), [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'All' || emp.department === filterDept;
        const matchesStatus = filterStatus === 'All' || emp.status === filterStatus;
        return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, filterDept, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{t.hr.title}</h2>
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
            />
            <button onClick={handleImportClick} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" /> {t.common.import}
            </button>
            <button onClick={handleExport} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Download className="w-4 h-4" /> {t.common.export}
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            >
            <UserPlus className="w-4 h-4" /> {t.hr.addEmployee}
            </button>
        </div>
      </div>

       {/* Filters */}
       <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="relative flex-1">
            <Search className="absolute start-3 top-3 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder={t.common.search} 
                className="w-full ps-10 pe-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex gap-2">
            <select 
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
            >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select 
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Terminated">Terminated</option>
            </select>
        </div>
      </div>

      {filteredEmployees.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
              <p>{t.hr.noEmployees}</p>
          </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow relative group">
            <button 
                onClick={() => onDelete(emp.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity rtl:right-auto rtl:left-4"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{emp.name}</h3>
                  <p className="text-sm text-slate-500">{emp.role}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.hr.department}</span>
                <span className="font-medium text-slate-800">{emp.department}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.common.status}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                   {emp.status === 'Active' ? t.hr.active : emp.status === 'On Leave' ? t.hr.onLeave : t.hr.terminated}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t.hr.joined}</span>
                <span className="text-slate-800">{emp.joinDate}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
              <button className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 border border-slate-200">
                <Mail className="w-4 h-4" /> {t.hr.email}
              </button>
               <button className="flex-1 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2 border border-slate-200">
                <Phone className="w-4 h-4" /> {t.hr.call}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{t.hr.addEmployee}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t.hr.fullName}</label>
                        <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.hr.role}</label>
                            <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.hr.department}</label>
                            <input required type="text" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.hr.salary}</label>
                            <input required type="number" className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t.common.status}</label>
                            <select className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="Active">{t.hr.active}</option>
                                <option value="On Leave">{t.hr.onLeave}</option>
                                <option value="Terminated">{t.hr.terminated}</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4">{t.common.save}</button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default HRModule;