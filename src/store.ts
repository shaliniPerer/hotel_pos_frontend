import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  role: string;
  name: string;
}

export interface StaffUser {
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
  kot_type?: 'KOT' | 'BOT';
  kot?: boolean;
  bot?: boolean;
  visible?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  menu_type?: 'function' | 'restaurant';
}

interface CartItem extends Product {
  quantity: number;
  note?: string;
  kotType: 'KOT' | 'BOT';
  cartKey: string;
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
  staff_id?: string;
  staff_name?: string;
  events?: any[];
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
  staffUsers: StaffUser[];
  selectedStaffId: string | null;
  selectedStaffName: string;
  cartStaffId: string | null;
  cartStaffName: string;
  orderType: 'table' | 'room' | 'takeaway' | 'delivery';
  orderReference: string;
  discount: number;
  activeOrderId: string | null;
  setUser: (user: User | null, token: string | null) => void;
  verifyToken: () => Promise<void>;
  logout: () => void;
  initSocket: () => void;
  fetchCategories: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  fetchStaffUsers: () => Promise<void>;
  createStaffUser: (data: { username: string; password: string; name: string; role: string }) => Promise<StaffUser>;
  updateStaffUser: (id: string, data: { name?: string; role?: string; password?: string }) => Promise<void>;
  deleteStaffUser: (id: string) => Promise<void>;
  setSelectedStaff: (id: string | null, name: string) => void;
  addCategory: (cat: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, cat: Partial<Omit<Category, 'id'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateCartItemNote: (productId: string, note: string) => void;
  changeKotType: (cartKey: string, newKotType: 'KOT' | 'BOT') => void;
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
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    const res = await fetch(`${base}${url}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('token');
      set({ user: null, token: null, categories: [], products: [] });
      window.location.href = '/login';
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
  staffUsers: [],
  selectedStaffId: null,
  selectedStaffName: '',
  cartStaffId: null,
  cartStaffName: '',
  orderType: 'table',
  orderReference: '',
  discount: 0,
  activeOrderId: null,

  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ user, token });
  },

  verifyToken: async () => {
    const { token, apiFetch } = get();
    if (!token) return;

    try {
      const res = await apiFetch('/api/auth/verify');
      if (!res.ok) {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      } else {
        const data = await res.json();
        set({ user: data.user });
      }
    } catch (err) {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ 
      user: null, 
      token: null, 
      cart: [], 
      orders: [], 
      categories: [], 
      products: [],
      discount: 0,
      orderReference: '',
      activeOrderId: null
    });
    if (get().socket) {
      get().socket?.disconnect();
      set({ socket: null });
    }
  },

  initSocket: () => {
    // Disconnect any existing socket before creating a new one (prevents duplicate
    // connections from React StrictMode double-invoking effects in development)
    const existing = get().socket;
    if (existing) {
      existing.disconnect();
    }
    const socketUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
    const socket = io(socketUrl);
    socket.on('order:created', (order: Order) => {
      set((state) => {
        // Avoid duplicating orders that fetchOrders() may have already added
        if (state.orders.some(o => o.id === order.id)) return state;
        return { orders: [order, ...state.orders] };
      });
    });
    socket.on('order:updated', (updatedOrder: Order) => {
      set((state) => {
        if (!state.orders.some(o => o.id === updatedOrder.id)) return state;
        return { orders: state.orders.map((o) => o.id === updatedOrder.id ? updatedOrder : o) };
      });
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
    const kotType = product.kot_type || 'KOT';
    const cartKey = `${product.id}_${kotType}`;
    set((state) => {
      const existing = state.cart.find((item) => item.cartKey === cartKey);
      // Lock the staff when the first item is added to an empty cart
      const staffLock = state.cart.length === 0 && state.cartStaffId === null
        ? { cartStaffId: state.selectedStaffId, cartStaffName: state.selectedStaffName }
        : {};
      if (existing) {
        return {
          ...staffLock,
          cart: state.cart.map((item) =>
            item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
          )
        };
      }
      return { ...staffLock, cart: [...state.cart, { ...product, quantity: 1, kotType, cartKey }] };
    });
  },

  removeFromCart: (cartKey) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.cartKey !== cartKey)
    }));
  },

  updateQuantity: (cartKey, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((item) => item.cartKey !== cartKey) };
      }
      return {
        cart: state.cart.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity } : item
        )
      };
    });
  },

  updateCartItemNote: (cartKey, note) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.cartKey === cartKey ? { ...item, note } : item
      )
    }));
  },

  changeKotType: (oldCartKey, newKotType) => {
    set((state) => {
      const item = state.cart.find(i => i.cartKey === oldCartKey);
      if (!item || item.kotType === newKotType) return state;
      const newCartKey = `${item.id}_${newKotType}`;
      const existing = state.cart.find(i => i.cartKey === newCartKey);
      if (existing) {
        return {
          cart: state.cart
            .map(i => i.cartKey === newCartKey ? { ...i, quantity: i.quantity + item.quantity } : i)
            .filter(i => i.cartKey !== oldCartKey)
        };
      }
      return {
        cart: state.cart.map(i => i.cartKey === oldCartKey ? { ...i, kotType: newKotType, cartKey: newCartKey } : i)
      };
    });
  },

  clearCart: () => set({ cart: [], discount: 0, orderReference: '', cartStaffId: null, cartStaffName: '' }),

  setOrderType: (type, ref) => set({ orderType: type, orderReference: ref }),
  
  setDiscount: (discount) => set({ discount }),

  setActiveOrderId: (id) => set({ activeOrderId: id }),

  loadOrderIntoCart: (order) => {
    const { products } = get();
    const cartItems = order.items!.map(item => {
      const product = products.find(p => p.id === item.product_id);
      const kotType: 'KOT' | 'BOT' = product?.kot_type || (product?.bot ? 'BOT' : 'KOT');
      const cartKey = `${item.product_id}_${kotType}`;
      return {
        id: item.product_id,
        name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        category_id: product?.category_id || '',
        image: product?.image || '',
        code: product?.code || '',
        kotType,
        cartKey,
      };
    });
    set({
      cart: cartItems,
      orderType: order.type as 'table' | 'room' | 'takeaway' | 'delivery',
      orderReference: order.reference,
      discount: order.discount,
      activeOrderId: order.id,
      cartStaffId: order.staff_id || null,
      cartStaffName: order.staff_name || '',
    });
  },

  fetchStaffUsers: async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const staffUsers = await res.json();
        set({ staffUsers });
      }
    } catch (e) {
      console.error('fetchStaffUsers error:', e);
    }
  },

  createStaffUser: async (data) => {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create user');
    const created: StaffUser = await res.json();
    set((state) => ({ staffUsers: [...state.staffUsers, created] }));
    return created;
  },

  updateStaffUser: async (id, data) => {
    const res = await apiFetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    const updated: StaffUser = await res.json();
    set((state) => ({ staffUsers: state.staffUsers.map((s) => s.id === id ? updated : s) }));
  },

  deleteStaffUser: async (id) => {
    const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete user');
    set((state) => ({ staffUsers: state.staffUsers.filter((s) => s.id !== id) }));
  },

  setSelectedStaff: (id, name) => set({ selectedStaffId: id, selectedStaffName: name }),

  apiFetch,
  };
});

