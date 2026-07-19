export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';

export interface Product {
  id: string;
  name: string;
  normalizedName: string;
  defaultPrice: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Motif {
  id: string;
  name: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItemList {
  id: string;
  productId: string;
  motifId: string;
  quantity: number;
  unitPrice: string;
  lineSubtotal: string;
  discountType: DiscountType;
  discountValue: string;
  discountAmount: string;
  lineTotal: string;
  hasImage?: boolean;
  product: { id: string; name: string };
  motif: { id: string; name: string };
}

export interface SaleListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  subtotal: string;
  generalDiscountType: DiscountType;
  generalDiscountValue: string;
  generalDiscountAmount: string;
  total: string;
  notes: string | null;
  lineCount: number;
  totalUnits: number;
  productSummary: string[];
  itemDiscountsTotal: string;
  items: SaleItemList[];
}

export interface SalesPage {
  data: SaleListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SaleItemDetail extends SaleItemList {
  imageBase64?: string | null;
  imageMimeType?: string | null;
}

export interface SaleDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  subtotal: string;
  generalDiscountType: DiscountType;
  generalDiscountValue: string;
  generalDiscountAmount: string;
  total: string;
  notes: string | null;
  items: SaleItemDetail[];
}

export interface CreateSalePayload {
  items: Array<{
    productId: string;
    motifName: string;
    quantity: number;
    unitPrice: number;
    discountType: DiscountType;
    discountValue: number;
    imageBase64?: string;
    imageMimeType?: string;
  }>;
  generalDiscountType: DiscountType;
  generalDiscountValue: number;
  notes?: string;
}

export interface StatsSummary {
  totalSold: string;
  salesCount: number;
  totalUnits: number;
  averageTicket: string;
  totalDiscounts: string;
}

export interface ProductStats {
  productId: string;
  productName: string;
  units: number;
  salesCount: number;
  gross: string;
  discounts: string;
  net: string;
  motifs: Array<{
    motifId: string;
    motifName: string;
    units: number;
  }>;
}
