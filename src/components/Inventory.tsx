import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { Product, Category, Sale } from '../types';
import Toast, { ToastType } from './Toast';
import { 
  Plus, Search, Pencil, Trash2, Package, Check, X, TrendingUp, History, AlertCircle 
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: ToastType }>({
    show: false,
    message: '',
    type: ToastType.SUCCESS
  });
  const [selectedForDetail, setSelectedForDetail] = useState<Product | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const productsData = await api.get('/products');
      setProducts(productsData);

      const categoriesData = await api.get('/categories');
      setCategories(categoriesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const now = new Date().toISOString();
      const payload = {
        ...formData,
        updatedAt: now
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', {
          ...payload,
          id: `prod_${Date.now()}`,
          createdAt: now
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', category: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5 });
      fetchData();

      const isLowStock = formData.stock < formData.minStock;
      setToast({
        show: true,
        message: isLowStock 
          ? `Guardado. ¡Atención! Stock por debajo del mínimo.` 
          : 'Catálogo actualizado con éxito.',
        type: isLowStock ? ToastType.WARNING : ToastType.SUCCESS
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  async function updateField(id: string, field: string, value: any) {
    try {
      await api.put(`/products/${id}`, {
        [field]: value
      });
      
      const product = products.find(p => p.id === id);
      if (product) {
        const currentStock = field === 'stock' ? value : product.stock;
        const currentMin = field === 'minStock' ? value : (product.minStock || 0);

        if (currentStock < currentMin) {
          setToast({
            show: true,
            message: `¡Advertencia! Stock de ${product.name} es insuficiente (${currentStock}/${currentMin})`,
            type: ToastType.WARNING
          });
        } else {
          setToast({
            show: true,
            message: 'Información actualizada',
            type: ToastType.SUCCESS
          });
        }
      }
      
      fetchData();
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchProductHistory(productId: string) {
    setLoadingHistory(true);
    try {
      const allSales: Sale[] = await api.get('/sales');
      // Simple filter for the last 10 sales of this product
      const history = allSales
        .filter(s => s.productId === productId)
        .slice(0, 10);
      setSalesHistory(history);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleRowClick = (product: Product, e: any) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setSelectedForDetail(product);
    fetchProductHistory(product.id!);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Gestión de Cava</h2>
          <p className="text-slate-400 text-sm italic">Control de etiquetas, varietales y existencias</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', category: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5 });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-wine-800 hover:bg-wine-900 text-white rounded-lg font-semibold shadow-md shadow-wine-900/10 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Etiqueta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-wine-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-wine-50 flex flex-col md:flex-row gap-4 items-center bg-cream-50/30">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-300 group-focus-within:text-wine-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o varietal..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 transition-all text-sm outline-none"
            />
          </div>
          <select className="w-full md:w-48 px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm outline-none">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-cream-50/50 text-wine-800/60 text-[10px] font-bold uppercase tracking-widest border-b border-wine-100">
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Costo</th>
                <th className="px-6 py-4">Precio</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wine-50">
              {filteredProducts.map((p) => (
                <tr 
                  key={p.id} 
                  onClick={(e) => handleRowClick(p, e)}
                  className="hover:bg-cream-50/30 transition-colors group text-sm cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-700">{p.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-wine-50 text-wine-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{p.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      defaultValue={p.costPrice}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== p.costPrice) updateField(p.id!, 'costPrice', val);
                      }}
                      className="w-24 bg-transparent border-none focus:ring-1 focus:ring-wine-200 rounded font-mono italic text-slate-500 outline-none p-1 transition-all"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="number"
                      defaultValue={p.salePrice}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== p.salePrice) updateField(p.id!, 'salePrice', val);
                      }}
                      className="w-24 bg-transparent border-none focus:ring-1 focus:ring-wine-200 rounded font-bold text-wine-900 outline-none p-1 transition-all"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <input 
                        type="number"
                        defaultValue={p.stock}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (val !== p.stock) updateField(p.id!, 'stock', val);
                        }}
                        className={cn(
                          "w-16 bg-transparent border-none text-center focus:ring-1 focus:ring-wine-200 rounded font-mono text-sm outline-none p-1 transition-all",
                          p.stock <= (p.minStock || 5) ? "text-red-600 font-bold" : "text-slate-600"
                        )}
                      />
                      {p.stock <= (p.minStock || 5) && (
                        <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setEditingProduct(p);
                        setFormData({
                          name: p.name,
                          category: p.category,
                          costPrice: p.costPrice,
                          salePrice: p.salePrice,
                          stock: p.stock,
                          minStock: p.minStock || 5
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-wine-700 font-semibold hover:underline mr-4"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id!)}
                      className="text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic text-sm">
              No hay etiquetas que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Panel */}
      <AnimatePresence>
        {selectedForDetail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedForDetail(null)}
              className="fixed inset-0 bg-wine-950/20 backdrop-blur-[2px] z-[150]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[160] overflow-y-auto border-l border-wine-100"
            >
              <div className="p-6 border-b border-wine-50 bg-cream-50/30 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-wine-800 rounded-lg text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-black text-wine-950 text-lg leading-tight uppercase italic">{selectedForDetail.name}</h3>
                    <p className="text-[10px] font-bold text-wine-800/40 uppercase tracking-widest">{selectedForDetail.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedForDetail(null)}
                  className="p-2 hover:bg-wine-100 rounded-full transition-colors text-wine-400 hover:text-wine-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Precio de Venta</p>
                    <p className="text-xl font-mono font-bold text-wine-900">{formatCurrency(selectedForDetail.salePrice)}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Actual</p>
                    <div className="flex items-end gap-2">
                      <p className={cn(
                        "text-xl font-mono font-bold",
                        selectedForDetail.stock <= (selectedForDetail.minStock || 0) ? "text-red-500" : "text-slate-700"
                      )}>{selectedForDetail.stock}</p>
                      <span className="text-[10px] text-slate-400 font-bold mb-1">UNIDADES</span>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-wine-950 uppercase tracking-[0.2em]">
                    <TrendingUp className="w-3 h-3" /> Rendimiento y Márgenes
                  </h4>
                  <div className="space-y-3 bg-wine-50/30 p-4 rounded-xl border border-wine-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-wine-800/60 font-medium">Costo de Bodega</span>
                      <span className="font-mono font-bold text-slate-600">{formatCurrency(selectedForDetail.costPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-wine-800/60 font-medium">Margen por Unidad</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(selectedForDetail.salePrice - selectedForDetail.costPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-wine-800/60 font-medium">% de Ganancia</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {Math.round(((selectedForDetail.salePrice - selectedForDetail.costPrice) / selectedForDetail.costPrice) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sales History */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-[10px] font-black text-wine-950 uppercase tracking-[0.2em]">
                    <History className="w-3 h-3" /> Historial Reciente (Últimas 10)
                  </h4>
                  
                  {loadingHistory ? (
                    <div className="py-10 flex justify-center">
                      <div className="w-6 h-6 border-2 border-wine-200 border-t-wine-800 rounded-full animate-spin" />
                    </div>
                  ) : salesHistory.length > 0 ? (
                    <div className="space-y-3">
                      {salesHistory.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cream-50 flex items-center justify-center text-wine-800 font-bold text-xs">
                              {sale.quantity}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{sale.paymentMethod}</p>
                              <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">
                                {new Date(sale.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs font-mono font-bold text-wine-900 group-hover:scale-110 transition-transform">
                            {formatCurrency(sale.totalAmount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <p className="text-xs text-slate-400 italic">Aún no se registran ventas para esta etiqueta.</p>
                    </div>
                  )}
                </div>

                {/* Meta Data */}
                <div className="pt-8 border-t border-wine-50">
                   <div className="grid grid-cols-2 gap-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      <div>
                        <p>Última actualización</p>
                        <p className="text-slate-600 mt-1">{new Date(selectedForDetail.updatedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p>ID Único de Producto</p>
                        <p className="text-slate-600 mt-1 font-mono">{selectedForDetail.id?.slice(0, 8)}...</p>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-wine-100"
            >
              <div className="p-6 border-b border-wine-50 bg-cream-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-wine-900">
                  {editingProduct ? 'Editar Información' : 'Nuevo Ingreso a Cava'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-wine-400 hover:text-wine-600">×</button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Nombre del Vino / Bebida</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm outline-none"
                    placeholder="Ej. Malbec Reserva 2021"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Categoría / Estilo</label>
                    <select 
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm outline-none"
                    >
                      <option value="">Selección...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Unidades</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Costo de Bodega ($)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-wine-800/50 uppercase tracking-widest leading-loose">Precio de Lista ($)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      step="0.01"
                      value={formData.salePrice}
                      onChange={(e) => setFormData({...formData, salePrice: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 text-sm font-mono font-bold text-wine-800 outline-none"
                    />
                  </div>
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
                    {editingProduct ? 'Confirmar Cambios' : 'Registrar Etiqueta'}
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
