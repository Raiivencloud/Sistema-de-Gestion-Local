import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { Category } from '../types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/categories', {
          id: `cat_${Date.now()}`,
          ...formData
        });
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Seguro quieres eliminar esta categoría? (No afectará a los productos ya creados)')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Categorías de la Cava</h2>
          <p className="text-slate-400 text-sm italic">Organiza tu bodega por varietales, regiones o tipos</p>
        </div>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-wine-800 hover:bg-wine-900 text-white rounded-lg font-semibold shadow-md shadow-wine-900/10 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-xl border border-wine-100 shadow-sm flex items-start justify-between group hover:border-wine-300 transition-colors">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-wine-50 flex items-center justify-center text-wine-800 font-bold text-xl shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{c.name}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description || 'Sin notas de cata adicionales'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingCategory(c);
                  setFormData({ name: c.name, description: c.description || '' });
                  setIsModalOpen(true);
                }}
                className="p-2 text-slate-300 hover:text-wine-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(c.id!)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full py-20 text-center text-wine-100 italic text-sm">
            No hay categorías registradas en la bodega.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-wine-950/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-wine-100"
            >
              <div className="p-6 border-b border-wine-50 bg-cream-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-wine-900">
                  {editingCategory ? 'Modificar Categoría' : 'Nueva Categoría de Bodega'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-wine-400 hover:text-wine-600">×</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Nombre</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm outline-none"
                    placeholder="Ej. Tintos de Guarda"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Descripción / Notas</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm outline-none h-24 resize-none"
                    placeholder="Detalles sobre este tipo de bebidas..."
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-wine-50">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-wine-50 hover:bg-wine-100 text-wine-800 rounded-lg font-bold text-sm transition-all"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-wine-800 hover:bg-wine-900 text-white rounded-lg font-bold text-sm shadow-md shadow-wine-900/20 transition-all"
                  >
                    {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
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
