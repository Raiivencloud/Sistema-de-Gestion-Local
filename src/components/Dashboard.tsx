import { useState, useEffect, FormEvent } from 'react';
import { api } from '../lib/api';
import { Product, Sale, PaymentMethod, View, Expense } from '../types';
import Toast, { ToastType } from './Toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Package, AlertTriangle, Wine, Calendar, Plus, Minus, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = ['#721926', '#a22d3d', '#d44a5a', '#f9cbd1'];

interface DashboardProps {
  onViewChange: (view: View) => void;
}

export default function Dashboard({ onViewChange }: DashboardProps) {
  const [performance, setPerformance] = useState({
    day: 0,
    week: 0,
    month: 0,
    year: 0
  });
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);

  // Quick Sale Modal State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [pm, setPm] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [savingSale, setSavingSale] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: ToastType }>({
    show: false,
    message: '',
    type: ToastType.SUCCESS
  });

  useEffect(() => {
    const init = async () => {
      await fetchDashboardData();
      await fetchProducts();
    };
    init();
  }, []);

  async function fetchProducts() {
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const now = new Date();
      const yearStart = startOfYear(now).toISOString();
      const yearEnd = new Date().toISOString();

      // Fetch ALL data from SQLite via API
      const allSales: Sale[] = await api.get(`/sales?start=${yearStart}&end=${yearEnd}`);
      const allExpenses: Expense[] = await api.get('/expenses');
      const allProducts: Product[] = await api.get('/products');

      const calculateNet = (sales: Sale[], expenses: Expense[], start: Date) => {
        const sTotal = sales
          .filter(s => new Date(s.timestamp) >= start)
          .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const eTotal = expenses
          .filter(e => new Date(e.timestamp) >= start)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        return sTotal - eTotal;
      };

      setPerformance({ 
        day: calculateNet(allSales, allExpenses, startOfDay(now)), 
        week: calculateNet(allSales, allExpenses, startOfWeek(now, { weekStartsOn: 1 })), 
        month: calculateNet(allSales, allExpenses, startOfMonth(now)), 
        year: calculateNet(allSales, allExpenses, startOfYear(now)) 
      });

      // Payment Methods Distribution (Current Month)
      const currentMonthSales = allSales.filter(s => new Date(s.timestamp) >= startOfMonth(now));
      const payMethods = currentMonthSales.reduce((acc: any, s) => {
        const method = s.paymentMethod || 'Otros';
        acc[method] = (acc[method] || 0) + (s.totalAmount || 0);
        return acc;
      }, {});
      setPaymentData(Object.entries(payMethods).map(([name, value]) => ({ name, value })));

      // Ranking (Year)
      const productRanking = allSales.reduce((acc: any, s) => {
        acc[s.productName] = (acc[s.productName] || 0) + (s.quantity || 0);
        return acc;
      }, {});
      const sortedRanking = Object.entries(productRanking)
        .map(([name, quantity]) => ({ name, quantity: Number(quantity) || 0 }))
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 5);
      setRankingData(sortedRanking);

      // Category Performance (Yearly Total Amount)
      const catRanking = allSales.reduce((acc: any, s) => {
        acc[s.category] = (acc[s.category] || 0) + (s.totalAmount || 0);
        return acc;
      }, {});
      const sortedCatRanking = Object.entries(catRanking)
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .sort((a: any, b: any) => b.value - a.value);
      setCategoryData(sortedCatRanking);

      // Monthly Comparison Data (Sales vs Expenses)
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthlyData = months.map((month, index) => {
        const monthSales = allSales.filter(s => new Date(s.timestamp).getMonth() === index)
          .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const monthExpenses = allExpenses.filter(e => new Date(e.timestamp).getMonth() === index)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        return {
          name: month,
          Ventas: monthSales || 0,
          Egresos: monthExpenses || 0,
          Balance: (monthSales || 0) - (monthExpenses || 0)
        };
      });
      setComparisonData(monthlyData.slice(0, now.getMonth() + 1));

      // Low Stock count
      const lowStock = allProducts.filter(p => p.stock <= (p.minStock || 5)).length;
      setLowStockCount(lowStock);

    } catch (error) {
      console.error('Fatal Dashboard Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickSale(e: FormEvent) {
    e.preventDefault();
    if (!selectedProduct || savingSale) return;
    setSavingSale(true);
    try {
      const now = new Date().toISOString();
      const newStock = (selectedProduct.stock || 0) - (quantity || 0);
      const minS = selectedProduct.minStock || 0;

      await api.post('/sales', {
        id: `sale_${Date.now()}`,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: quantity,
        salePrice: selectedProduct.salePrice || 0,
        costPrice: selectedProduct.costPrice || 0,
        totalAmount: (selectedProduct.salePrice || 0) * (quantity || 0),
        category: selectedProduct.category,
        paymentMethod: pm,
        timestamp: now
      });

      await api.put(`/products/${selectedProduct.id}`, {
        stock: newStock
      });

      setIsSaleModalOpen(false);
      setSelectedProduct(null);
      setQuantity(1);
      await fetchDashboardData();
      await fetchProducts();

      if (newStock < minS) {
        setToast({
          show: true,
          message: `¡Atención! ${selectedProduct.name} quedó por debajo del stock mínimo (${newStock}/${minS})`,
          type: ToastType.WARNING
        });
      } else {
        setToast({
          show: true,
          message: 'Venta registrada con éxito',
          type: ToastType.SUCCESS
        });
      }
    } catch (error) {
       console.error("Sale error:", error);
    } finally {
      setSavingSale(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-wine-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-wine-800/60 font-serif italic">Calculando balance real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-black text-wine-950 tracking-tight">Rendimiento Real</h2>
          <p className="text-wine-800/60 text-sm italic">Facturación neta (Ventas - Gastos) de Terruño Wine</p>
        </div>
        <div className="bg-wine-50 px-4 py-2 rounded-lg border border-wine-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-wine-800" />
          <span className="text-xs font-bold text-wine-900 uppercase tracking-widest">{format(new Date(), 'dd MMMM, yyyy', { locale: es })}</span>
        </div>
      </div>

      {/* Comparative History Chart */}
      <div className="bg-white p-6 rounded-2xl border border-wine-100 shadow-sm">
        <div className="flex items-center justify-between mb-8 border-b border-wine-50 pb-4">
          <div>
            <h3 className="text-sm font-bold text-wine-950 uppercase tracking-widest italic font-serif">Balance Histórico: Ventas vs Egresos</h3>
            <p className="text-[10px] text-wine-800/40 font-bold uppercase mt-1">Comparativa anual de flujo de caja</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-wine-800" />
              <span className="text-[10px] font-bold text-slate-400">VENTAS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-slate-400">EGRESOS</span>
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fdfcf7" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#721926', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#721926', fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `$${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid #f9cbd1', boxShadow: 'none' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Bar dataKey="Ventas" fill="#721926" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Egresos" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Hoy" value={formatCurrency(performance.day)} icon={DollarSign} color="wine" delay={0} />
        <StatCard title="Semana" value={formatCurrency(performance.week)} icon={Calendar} color="wine" delay={0.1} />
        <StatCard title="Mes" value={formatCurrency(performance.month)} icon={TrendingUp} color="gold" delay={0.2} />
        <StatCard title="Año" value={formatCurrency(performance.year)} icon={DollarSign} color="gold" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-2xl border border-wine-100 shadow-sm">
          <h3 className="text-sm font-bold text-wine-950 uppercase tracking-widest mb-6 border-b border-wine-50 pb-3 italic font-serif">Formas de Pago</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f9cbd1' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Most Sold Products */}
        <div className="bg-white p-6 rounded-2xl border border-wine-100 shadow-sm">
          <h3 className="text-sm font-bold text-wine-950 uppercase tracking-widest mb-6 border-b border-wine-50 pb-3 italic font-serif">Las más Vendidas (Unidades)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fdfcf7" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#721926', fontSize: 10, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#fdfcf7' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f9cbd1' }}
                />
                <Bar 
                  dataKey="quantity" 
                  fill="#721926" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category Ranking */}
        <div className="bg-white p-6 rounded-2xl border border-wine-100 shadow-sm">
          <h3 className="text-sm font-bold text-wine-950 uppercase tracking-widest mb-6 border-b border-wine-50 pb-3 italic font-serif">Rendimiento por Categoría ($)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#fdfcf7" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a22d3d', fontSize: 10, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#fdfcf7' }}
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f9cbd1' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#a22d3d" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-wine-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-wine-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-wine-200" />
              </div>
              <h4 className="font-serif italic font-bold text-lg">Alertas de Bodega</h4>
            </div>
            <p className="text-wine-200 text-sm mb-6">
              Tienes <span className="text-white font-bold">{lowStockCount} etiquetas</span> con stock crítico (menor a 5 unidades).
            </p>
            <button 
              onClick={() => onViewChange(View.INVENTORY)}
              className="px-6 py-2.5 bg-white text-wine-950 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-wine-50 transition-all shadow-lg shadow-black/20"
            >
              Ver Inventario
            </button>
          </div>
          <Wine className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
        </div>

        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Plus className="w-5 h-5" />
            </div>
            <h4 className="font-serif italic font-bold text-lg text-emerald-950">Anotación Rápida</h4>
          </div>
          <p className="text-emerald-800/60 text-sm mb-6">¿Acabas de despachar una botella? Regístralo ahora para mantener tu stock al día.</p>
          <button 
            onClick={() => setIsSaleModalOpen(true)}
            className="px-6 py-2.5 bg-emerald-800 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-lg shadow-emerald-900/20"
          >
            Nueva Anotación
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSaleModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaleModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-emerald-100"
            >
              <div className="p-6 border-b border-emerald-50 bg-emerald-50/30 flex justify-between items-center">
                <h3 className="text-lg font-bold text-emerald-900 font-serif italic">Nueva Anotación</h3>
                <button onClick={() => setIsSaleModalOpen(false)} className="text-emerald-400 hover:text-emerald-600 text-2xl">×</button>
              </div>

              <form onSubmit={handleQuickSale} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Etiqueta</label>
                  <select 
                    required
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const p = products.find(p => p.id === e.target.value);
                      setSelectedProduct(p || null);
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-sm outline-none appearance-none"
                  >
                    <option value="">Selecciona un producto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                        {p.name} ({p.stock} uni) - {formatCurrency(p.salePrice)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cantidad</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-slate-100"><Minus className="w-4 h-4" /></button>
                      <span className="flex-1 text-center font-bold">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-slate-100"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</label>
                    <select 
                      value={pm}
                      onChange={(e) => setPm(e.target.value as PaymentMethod)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-xs font-bold outline-none uppercase tracking-widest"
                    >
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex justify-between items-center text-emerald-950">
                    <span className="text-xs font-bold uppercase tracking-widest">Total a Anotar</span>
                    <span className="text-xl font-black">{selectedProduct ? formatCurrency(selectedProduct.salePrice * quantity) : '$0.00'}</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={!selectedProduct || savingSale}
                  className="w-full py-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                >
                  {savingSale ? 'Guardando...' : 'Confirmar Registro'}
                  {!savingSale && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-4 md:p-6 rounded-2xl border border-wine-100 shadow-sm transition-all hover:border-wine-300 group"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-wine-800/40 uppercase tracking-widest">{title}</p>
        <div className={cn(
          "p-2 rounded-lg transition-colors",
          color === 'wine' ? 'bg-wine-50 text-wine-800 group-hover:bg-wine-800 group-hover:text-white' : 'bg-cream-50 text-wine-900 group-hover:bg-wine-900 group-hover:text-white'
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-xl md:text-2xl font-black text-wine-950 tracking-tight">{value}</p>
        <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tighter mt-1 italic">Balance Neto</p>
      </div>
    </motion.div>
  );
}
