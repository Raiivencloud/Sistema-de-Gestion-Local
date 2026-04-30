import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { Expense, ExpenseCategory } from '../types';
import { Plus, Trash2, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: ExpenseCategory.OTHERS,
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const data = await api.get('/expenses');
      setExpenses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const ts = new Date(formData.date + 'T12:00:00').toISOString();
      await api.post('/expenses', {
        id: `exp_${Date.now()}`,
        category: formData.category,
        amount: formData.amount,
        description: formData.description,
        timestamp: ts
      });
      setIsModalOpen(false);
      setFormData({
        category: ExpenseCategory.OTHERS,
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchExpenses();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este egreso?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (error) {
      console.error(error);
    }
  }

  const categories = Object.values(ExpenseCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Caja de Egresos</h2>
          <p className="text-slate-400 text-sm italic">Registro de gastos, servicios y compras</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-md shadow-red-100 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-red-50/30 text-red-800/60 text-[10px] font-bold uppercase tracking-widest border-b border-red-100">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-red-50/10 transition-colors group text-sm">
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {format(new Date(e.timestamp), 'dd/MM/yy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 italic">{e.description}</td>
                  <td className="px-6 py-4 font-bold text-red-600">
                    -{formatCurrency(e.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(e.id!)}
                      className="text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && !loading && (
            <div className="py-20 text-center text-slate-300 italic text-sm">
              No hay egresos registrados.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-red-100"
            >
              <div className="p-6 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                <h3 className="text-lg font-bold text-red-900">
                  Nuevo Egreso
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-red-400 hover:text-red-600 text-2xl">×</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha del Gasto</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
                    <input 
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
                    <select 
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-sm outline-none appearance-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monto ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
                    <input 
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-sm font-mono font-bold outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descripción</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-red-300" />
                    <textarea 
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-red-100 rounded-lg focus:ring-2 focus:ring-red-500/10 focus:border-red-500 text-sm outline-none h-24 resize-none"
                      placeholder="Ej. Factura A - Vinos del Sur"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-red-50">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-md shadow-red-900/20 transition-all"
                  >
                    Guardar Egreso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
