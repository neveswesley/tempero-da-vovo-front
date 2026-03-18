export interface SideDish {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  sideDishGroupId: string;
}

export interface SideDishGroup {
  id: string;
  name: string;
  sideDish: SideDish[];
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  isPaused: boolean;
}

export interface ProductWithSideDishes {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  productSideDishGroups: ProductSideDishGroup[];
}

export interface ProductSideDishGroup {
  id: string;
  productId: string;
  sideDishGroupId: string;
  sideDishGroup: SideDishGroup;
  isRequired: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedSideDishes: SelectedSideDish[];
  totalPrice: number;
}

export interface SelectedSideDish {
  sideDishId: string;
  sideDishName: string;
  quantity: number;
  unitPrice: number;
  groupName: string;
}