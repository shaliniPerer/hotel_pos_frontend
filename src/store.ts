import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  role: string;
  name: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  price: number;
  image: string;
  code?: string;
  description?: string;
  kot?: boolean;
  bot?: boolean;
  visible?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  type: string;
  reference: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  cashier_id: string;
  created_at: string;
  updated_at: string;
  items?: any[];
}

interface AppState {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  orderType: 'table' | 'room' | 'takeaway' | 'delivery';
  orderReference: string;
  discount: number;
  activeOrderId: string | null;
  setUser: (user: User | null, token: string | null) => void;
  initSocket: () => void;
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, cat: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: 'table' | 'room' | 'takeaway' | 'delivery', ref: string) => void;
  setDiscount: (discount: number) => void;
  setActiveOrderId: (id: string | null) => void;
  loadOrderIntoCart: (order: Order) => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export const useStore = create<AppState>((set, get) => {
  /** Centralised fetch that auto-logs-out on 401 */
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { token } = get();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('token');
      set({ user: null, token: null, categories: [], products: [] });
    }
    return res;
  };

  return {
  user: null,
  token: localStorage.getItem('token'),
  socket: null,
  categories: [],
  products: [],
  cart: [],
  orders: [],
  orderType: 'table',
  orderReference: '',
  discount: 0,
  activeOrderId: null,

  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ user, token });
  },

  initSocket: () => {
    const socket = io(window.location.origin);
    socket.on('order:created', (order: Order) => {
      set((state) => ({ orders: [order, ...state.orders] }));
    });
    socket.on('order:updated', (updatedOrder: Order) => {
      set((state) => ({
        orders: state.orders.map((o) => o.id === updatedOrder.id ? updatedOrder : o)
      }));
    });
    set({ socket });
  },

  fetchCategories: async () => {
    try {
      const res = await apiFetch('/api/categories');
      if (res.ok) {
        const categories = await res.json();
        set({ categories });
      }
    } catch (e) {
      console.error('fetchCategories error:', e);
    }
  },

  fetchProducts: async () => {
    try {
      const res = await apiFetch('/api/products');
      if (res.ok) {
        const products = await res.json();
        set({ products });
      }
    } catch (e) {
      console.error('fetchProducts error:', e);
    }
  },

  fetchOrders: async () => {
    try {
      const res = await apiFetch('/api/orders');
      if (res.ok) {
        const orders = await res.json();
        set({ orders });
      }
    } catch (e) {
      console.error('fetchOrders error:', e);
    }
  },

  addCategory: async (cat) => {
    const res = await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) throw new Error('Failed to create category');
    const created: Category = await res.json();
    set((state) => ({ categories: [...state.categories, created].sort((a, b) => a.sort_order - b.sort_order) }));
    return created;
  },

  updateCategory: async (id, updates) => {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update category');
    const updated: Category = await res.json();
    set((state) => ({
      categories: state.categories.map((c) => c.id === id ? updated : c).sort((a, b) => a.sort_order - b.sort_order),
    }));
  },

  deleteCategory: async (id) => {
    const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete category');
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }));
  },

  addProduct: async (product) => {
    const res = await apiFetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Failed to create product');
    const created = await res.json();
    set((state) => ({ products: [...state.products, created] }));
    return created;
  },

  updateProduct: async (id, updates) => {
    const res = await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update product');
    const updated = await res.json();
    set((state) => ({ products: state.products.map((p) => p.id === id ? updated : p) }));
  },

  deleteProduct: async (id) => {
    const res = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
  },

  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find((item) => item.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        };
      }
      return { cart: [...state.cart, { ...product, quantity: 1 }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== productId)
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((item) => item.id !== productId) };
      }
      return {
        cart: state.cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      };
    });
  },

  clearCart: () => set({ cart: [], discount: 0, orderReference: '' }),

  setOrderType: (type, ref) => set({ orderType: type, orderReference: ref }),
  
  setDiscount: (discount) => set({ discount }),

  setActiveOrderId: (id) => set({ activeOrderId: id }),

  loadOrderIntoCart: (order) => {
    const { products } = get();
    const cartItems = order.items!.map(item => {
      const product = products.find(p => p.id === item.product_id);
      return {
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        category_id: product?.category_id || '',
        image: product?.image || '',
        code: product?.code || ''
      };
    });
    set({
      cart: cartItems,
      orderType: order.type as 'table' | 'room' | 'takeaway' | 'delivery',
      orderReference: order.reference,
      discount: order.discount,
      activeOrderId: order.id
    });
  },

  apiFetch,
  };
});

