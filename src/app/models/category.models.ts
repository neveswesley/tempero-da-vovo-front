export interface Product {
description: any;
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

export interface CategoryWithProducts {
  categoryId: string;
  categoryName: string;
  description: string;
  products: Product[];
}

export interface Category {
  id: string;
  name: string;
}