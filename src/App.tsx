import { useState } from 'react';
import { View } from './types';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import QuickSale from './components/QuickSale';
import Categories from './components/Categories';
import Expenses from './components/Expenses';
import { Wine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
  
  // Dummy user for UI display (since it's a local desktop app)
  const user = {
    displayName: 'Administrador Bodega',
    photoURL: 'https://ui-avatars.com/api/?name=Admin&background=721926&color=fff'
  };

  return (
    <div className="min-h-screen bg-cream-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-wine-100 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-wine-800 rounded flex items-center justify-center text-white font-bold">T</div>
          <h1 className="text-xl font-semibold tracking-tight">
            TERRUÑO<span className="text-wine-700">WINE</span> 
            <span className="text-slate-400 font-normal ml-2 hidden sm:inline">| Sistema de Gestión Local</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end leading-none">
            <span className="text-[10px] text-wine-800 font-bold uppercase tracking-widest mb-1">Cava Virtual #01</span>
            <span className="text-sm font-semibold text-slate-700">{user.displayName}</span>
          </div>
          <img 
            src={user.photoURL} 
            alt="User" 
            className="w-10 h-10 rounded-full border border-wine-100 p-0.5 bg-white"
          />
        </div>
      </header>

      <Navbar activeView={activeView} onViewChange={setActiveView} user={user} />
      
      <main className="pl-20 pt-16 min-h-screen">
        <div className="max-w-[1600px] mx-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === View.DASHBOARD && <Dashboard onViewChange={setActiveView} />}
              {activeView === View.INVENTORY && <Inventory />}
              {activeView === View.SALES && <QuickSale />}
              {activeView === View.EXPENSES && <Expenses />}
              {activeView === View.CATEGORIES && <Categories />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="pl-20 py-4 bg-white border-t border-wine-100 flex items-center px-8 text-[10px] text-slate-500 uppercase tracking-widest mt-auto">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Base de Datos SQLite Conectada</span>
          <span className="hidden sm:inline opacity-50">|</span>
          <span className="hidden sm:inline">Instancia Local: Terruño Wine V1.2 Desktop</span>
        </div>
        <div className="ml-auto font-mono opacity-60">
          offline-capable-sqlite
        </div>
      </footer>
    </div>
  );
}
