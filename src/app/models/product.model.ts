import { Category } from "./category.models";

export interface CreateProductRequest {
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category: number;
  imageUrl?: string;
}

export interface Complement{
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  imageUrl?: string;
  isActive: boolean;
  category?: Category;
  complements?: Complement;
}
