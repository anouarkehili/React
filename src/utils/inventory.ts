// وظائف مساعدة لإدارة المخزون

export interface ProductQuantity {
  male_gym_quantity: number;
  female_gym_quantity: number;
}

/**
 * الحصول على الكمية الإجمالية للمنتج (مجموع الكميات في كلا الناديين)
 */
export const getTotalQuantity = (product: ProductQuantity): number => {
  return product.male_gym_quantity + product.female_gym_quantity;
};

/**
 * الحصول على الكمية المتاحة حسب نوع النادي
 */
export const getAvailableQuantity = (product: ProductQuantity, gymType: 'male' | 'female'): number => {
  return gymType === 'male' ? product.male_gym_quantity : product.female_gym_quantity;
};

/**
 * الحصول على اسم حقل الكمية حسب نوع النادي
 */
export const getQuantityField = (gymType: 'male' | 'female'): string => {
  return gymType === 'male' ? 'male_gym_quantity' : 'female_gym_quantity';
};

/**
 * التحقق من وجود مخزون كافي
 */
export const hasEnoughStock = (product: ProductQuantity, quantity: number, gymType: 'male' | 'female'): boolean => {
  const availableQuantity = getAvailableQuantity(product, gymType);
  return availableQuantity >= quantity;
};

/**
 * تنسيق عرض الكمية مع حالة المخزون
 */
export const formatQuantityDisplay = (product: ProductQuantity, gymType: 'male' | 'female') => {
  const totalQuantity = getTotalQuantity(product);
  const availableQuantity = getAvailableQuantity(product, gymType);
  
  return {
    total: totalQuantity,
    available: availableQuantity,
    isLowStock: availableQuantity < 5,
    status: availableQuantity < 5 ? 'مخزون منخفض' : 'متوفر'
  };
}; 