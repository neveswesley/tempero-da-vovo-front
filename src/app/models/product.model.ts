import { Category, CategoryWithProducts } from "./category.models";

export interface CreateProductRequest {
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category: number;
  imageUrl?: string;
}

export interface Complement {
  name: string;
  price: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  displayOrder: number;
}


export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  category: {
    id: string;
    categoryName: string;
    displayOrder: number;
  };
}

export interface AddItemToOrderRequest {
  restaurantId: string;
  clientSessionId: string;
  productId: string;
  quantity: number;
  observation?: string;
  sideDishes: {
    sideDishId: string;
    quantity: number;
  }[];
}

export interface OrderResponse {
  orderId: string;
  subTotal: number;
  total: number;
  itemsCount: number;
}
