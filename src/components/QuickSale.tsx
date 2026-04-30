import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Product, Sale, PaymentMethod } from '../types';
import Toast, { ToastType } from './Toast';
import { ShoppingCart, Plus, Minus, Trash2, Search, ArrowRight, Wine, Calendar, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem extends Product {
  quantity: number;
}

export default function QuickSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: ToastType }>({
    show: false,
    message: '',
    type: ToastType.SUCCESS
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const data = await api.get('/products');
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(item => item.id !== productId));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }

  const total = cart.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const selectedDate = new Date(saleDate + 'T12:00:00').toISOString();
      
      const lowStockItems: string[] = [];

      for (const item of cart) {
        const newStock = (item.stock || 0) - item.quantity;
        if (newStock < (item.minStock || 0)) {
          lowStockItems.push(item.name);
        }

        await api.post('/sales', {
          id: `sale_${Date.now()}_${item.id}`,
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          salePrice: item.salePrice,
          costPrice: item.costPrice,
          totalAmount: item.salePrice * item.quantity,
          category: item.category,
          paymentMethod: paymentMethod,
          timestamp: selectedDate
        });

        await api.put(`/products/${item.id}`, {
          stock: newStock
        });
      }
      
      setCart([]);
      await fetchProducts();

      if (lowStockItems.length > 0) {
        setToast({
          show: true,
          message: `Venta exitosa. Atención: ${lowStockItems.length} productos quedaron bajos en stock (${lowStockItems.slice(0, 2).join(', ')}${lowStockItems.length > 2 ? '...' : ''})`,
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
      console.error(error);
    } finally {
      setProcessing(false);
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paymentMethods = [
    { id: PaymentMethod.CASH, label: 'Efectivo', icon: Banknote },
    { id: PaymentMethod.MERCADO_PAGO, label: 'Mercado Pago', icon: Smartphone },
    { id: PaymentMethod.DEBIT, label: 'Débito', icon: CreditCard },
    { id: PaymentMethod.CREDIT, label: 'Crédito', icon: CreditCard },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      <Toast 
        isVisible={toast.show} 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Registro de Venta</h2>
            <p className="text-slate-400 text-sm italic">Cuaderno digital para anotar despachos</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-wine-100 shadow-sm">
            <Calendar className="w-4 h-4 text-wine-800" />
            <input 
              type="date" 
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="text-xs font-bold uppercase tracking-widest text-slate-600 outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-wine-100 shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-4 border-b border-wine-50 bg-cream-50/30">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wine-300 group-focus-within:text-wine-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar vino o varietal..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-wine-100 rounded-lg focus:ring-2 focus:ring-wine-500/10 focus:border-wine-500 transition-all text-sm outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={cn(
                  "flex flex-col p-3 rounded-xl border text-left transition-all group relative",
                  p.stock <= 0 
                  ? "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed" 
                  : "bg-white border-wine-50 hover:border-wine-300 hover:shadow-md active:scale-95"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="bg-wine-50 text-wine-700 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                    {p.category}
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-xs mb-1 truncate w-full">{p.name}</p>
                <div className="mt-auto flex justify-between items-end">
                  <p className="text-sm font-bold text-wine-800">{formatCurrency(p.salePrice)}</p>
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded",
                    p.stock <= 5 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {p.stock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:w-96 flex flex-col shrink-0">
        <div className="bg-white rounded-xl border border-wine-100 shadow-xl flex flex-col h-full overflow-hidden">
          <div className="p-5 border-b border-wine-50 bg-wine-950 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-md italic font-serif">Resumen de Venta</h3>
              <p className="text-[8px] text-wine-300 uppercase font-bold tracking-widest mt-1">Anotación manual</p>
            </div>
            <ShoppingCart className="w-4 h-4 text-wine-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border border-wine-50 bg-cream-50/20 group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-wine-700 font-bold">{formatCurrency(item.salePrice)}</p>
                </div>
                <div className="flex items-center bg-white border border-wine-100 rounded-lg">
                  <button onClick={() => updateQuantity(item.id!, -1)} className="p-1 hover:text-wine-800"><Minus className="w-2.5 h-2.5" /></button>
                  <span className="w-6 text-center text-[10px] font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id!, 1)} className="p-1 hover:text-wine-800"><Plus className="w-2.5 h-2.5" /></button>
                </div>
                <button onClick={() => removeFromCart(item.id!)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-wine-100">
                <Wine className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Sin productos</p>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-wine-50 bg-cream-50/10 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Método de Pago</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border text-[10px] font-bold transition-all",
                      paymentMethod === method.id 
                        ? "bg-wine-800 border-wine-800 text-white" 
                        : "bg-white border-wine-50 text-slate-500 hover:bg-wine-50"
                    )}
                  >
                    <method.icon className={cn("w-3.5 h-3.5", paymentMethod === method.id ? "text-wine-200" : "text-wine-400")} />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-wine-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Anotado</span>
                <span className="text-lg font-black text-wine-800 tracking-tight">{formatCurrency(total)}</span>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || processing}
                className="w-full mt-4 py-3 bg-wine-800 hover:bg-wine-900 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-lg shadow-wine-900/20 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                {processing ? "Guardando..." : "Registrar Venta"}
                {!processing && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
