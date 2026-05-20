/**
 * mockAdminData.js – All mock data for AdminDashboard tabs
 */

/* ─── Users ──────────────────────────────────────────────────── */
export const MOCK_USERS = [
  { id:1,  name:'Ahmed Khan',      email:'ahmed@example.com',      role:'patient',    status:'active',   joined:'2026-01-15', orders:12 },
  { id:2,  name:'Dr. Sara Ali',    email:'doctor@medeasy.pk',      role:'doctor',     status:'active',   joined:'2025-12-01', orders:0  },
  { id:3,  name:'Raza PharmD',     email:'pharmacist@medeasy.pk',  role:'pharmacist', status:'active',   joined:'2025-11-20', orders:0  },
  { id:4,  name:'Admin User',      email:'admin@medeasy.pk',       role:'admin',      status:'active',   joined:'2025-10-05', orders:0  },
  { id:5,  name:'Fatima Siddiqui', email:'fatima@example.com',     role:'patient',    status:'active',   joined:'2026-02-10', orders:5  },
  { id:6,  name:'Bilal Raza',      email:'bilal@example.com',      role:'patient',    status:'active',   joined:'2026-03-22', orders:3  },
  { id:7,  name:'Umar Farooq',     email:'umar@example.com',       role:'patient',    status:'suspended',joined:'2026-04-01', orders:1  },
  { id:8,  name:'Dr. Usman Tariq', email:'usman@example.com',      role:'doctor',     status:'active',   joined:'2026-01-08', orders:0  },
  { id:9,  name:'Sara Ali (P)',    email:'sara@example.com',       role:'patient',    status:'active',   joined:'2026-02-28', orders:2  },
  { id:10, name:'Nadia Hussain',   email:'nadia@example.com',      role:'patient',    status:'active',   joined:'2026-05-01', orders:0  },
];

/* ─── Sales ──────────────────────────────────────────────────── */
export const MONTHLY_SALES = {
  labels: ['Dec','Jan','Feb','Mar','Apr','May'],
  revenue: [42000, 58000, 61000, 74000, 82000, 95000],
  orders:  [312,   421,   398,   512,   587,   634],
};

export const TOP_MEDICINES = [
  { name:'Paracetamol 500mg', units:1240, revenue:62000,  category:'Analgesics' },
  { name:'Cetirizine 10mg',   units: 980, revenue:63700,  category:'Antihistamines' },
  { name:'Vitamin D3 5000IU', units: 870, revenue:243600, category:'Vitamins' },
  { name:'Omeprazole 20mg',   units: 750, revenue:71250,  category:'Gastroenterology' },
  { name:'Ibuprofen 400mg',   units: 690, revenue:51750,  category:'Analgesics' },
];

export const SALES_KPI = {
  totalRevenue:   412000,
  totalOrders:    2864,
  avgOrderValue:  144,
  returningRate:  62,
};

/* ─── Inventory ──────────────────────────────────────────────── */
export const INVENTORY_KPI = {
  totalProducts:  12,
  totalStockUnits:2125,
  totalStockValue:328400,
  lowStockCount:  1,
  outOfStockCount:1,
};

export const LOW_STOCK_ITEMS = [
  { id:5, name:'Metformin 500mg',        stock:0,  threshold:20, price:120, category:'Diabetes',      reorderQty:100 },
  { id:9, name:'Salbutamol Inhaler 100mcg', stock:8, threshold:10, price:450, category:'Respiratory', reorderQty:50  },
];

/* ─── Prescription Analytics ─────────────────────────────────── */
export const RX_KPI = {
  totalUploads:   47,
  verified:       31,
  rejected:        9,
  pending:         7,
  verificationRate: 66,
  avgReviewTime:  '24 min',
};

export const RX_BY_MONTH = {
  labels:   ['Dec','Jan','Feb','Mar','Apr','May'],
  uploads:  [4, 6, 7, 9, 11, 10],
  verified: [2, 4, 5, 7, 8,  5],
};
