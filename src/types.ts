export interface Product {
  id?: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock?: number;
  createdAt: string;
  updatedAt: string;
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  DEBIT = 'Débito',
  CREDIT = 'Crédito',
  MERCADO_PAGO = 'Mercado Pago'
}

export enum ExpenseCategory {
  SUPPLIER = 'Proveedores',
  ELECTRICITY = 'Luz',
  RENT = 'Alquiler',
  MERCHANDISE = 'Compra de Mercadería',
  SALARIES = 'Sueldos',
  OTHERS = 'Otros'
}

export interface Sale {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  totalAmount: number;
  category: string;
  paymentMethod: PaymentMethod;
  timestamp: string;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
}

export interface Expense {
  id?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  timestamp: string;
}

export enum View {
  DASHBOARD = 'dashboard',
  INVENTORY = 'inventory',
  SALES = 'sales',
  CATEGORIES = 'categories',
  EXPENSES = 'expenses'
}
