// category.models.ts
import { Product } from './product.model';

export interface CategoryWithProducts {
  categoryId: string;
  categoryName: string;
  displayOrder: number;
  products: Product[];
}



export interface Category {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  products?: Product[];
}