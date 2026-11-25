/**
 * Normalise a medicine document from the API into the shape the UI expects.
 * Accepts both camelCase (API) and legacy snake_case (mock) fields.
 */
export default function normalizeMedicine(db) {
  const price = Number(db.price) || 0;
  const originalPrice = Number(db.originalPrice ?? db.original_price ?? price) || price;
  const stock = db.stock !== undefined ? Number(db.stock) : db.in_stock ? 10 : 0;
  const discountPct =
    originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : db.discount_pct || 0;

  return {
    ...db,
    id: db._id || db.id,
    name: db.name,
    brand: db.brand || '',
    category: db.category || 'General',
    price,
    original_price: originalPrice > price ? originalPrice : undefined,
    discount_pct: discountPct,
    rating: Number(db.rating) || 0,
    reviews_count: db.reviews_count || db.reviews || db.reviewCount || 0,
    requires_prescription: Boolean(db.requiresPrescription ?? db.requires_prescription),
    stock,
    image: db.imageUrl || db.image || db.emoji || null,
    imageUrl: db.imageUrl || db.image || db.emoji || null,
  };
}

export const MEDICINE_CATEGORIES = [
  'Analgesics',
  'Antibiotics',
  'Antihistamines',
  'Gastroenterology',
  'Diabetes',
  'Cardiology',
  'Vitamins & Supplements',
  'Respiratory',
  'First Aid',
  'Dermatology',
  'Eye Care',
  'Child Health',
];
