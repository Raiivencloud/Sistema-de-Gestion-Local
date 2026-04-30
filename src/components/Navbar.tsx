import { LayoutDashboard, Wine, ShoppingCart, LogOut, Package, Receipt } from 'lucide-react';
import { View } from '../types';
import { cn } from '../lib/utils';

interface NavbarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  user: any;
}

export default function Navbar({ activeView, onViewChange, user }: NavbarProps) {
  const navItems = [
    { id: View.DASHBOARD, label: 'Resumen', icon: LayoutDashboard },
    { id: View.INVENTORY, label: 'Inventario', icon: Package },
    { id: View.SALES, label: 'Ventas', icon: ShoppingCart },
    { id: View.EXPENSES, label: 'Egresos', icon: Receipt },
    { id: View.CATEGORIES, label: 'Categorías', icon: Wine },
  ];

  return (
    <nav className="fixed left-0 top-16 bottom-0 w-20 bg-wine-950 flex flex-col items-center py-6 gap-6 z-40 transition-all duration-300">
      <div className="flex-1 w-full space-y-4 px-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={item.label}
            className={cn(
              "w-full flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 group relative",
              activeView === item.id 
                ? "bg-wine-700 text-white shadow-lg shadow-wine-900/50" 
                : "text-wine-300 hover:text-white hover:bg-wine-900"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
              {item.label}
            </span>
            {activeView === item.id && (
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-wine-500 rounded-r-full" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-auto px-3 w-full space-y-4">
        <button 
          onClick={() => {}}
          title="Modo Escritorio"
          className="w-full flex items-center justify-center p-3 rounded-lg text-wine-400 cursor-default"
        >
          <div className="w-3 h-3 bg-emerald-500 rounded-full" />
        </button>
      </div>
    </nav>
  );
}
