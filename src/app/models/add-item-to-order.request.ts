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
