export interface OpeningHourResponse {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
}

export interface RestaurantResponse {
  name: string;
  phone: string;
  description?: string;
  restaurantCategory?: number;
  openingHours: OpeningHourResponse[];
  paymentWays: number[];
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}