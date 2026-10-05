import axios from 'axios';

export interface GasPrices {
  petrolimex: {
    company: string;
    updated_at: string;
    prices: Array<{
      name: string;
      price_zone1: string;
      price_zone2?: string;
    }>;
  };
  pvoil: {
    company: string;
    updated_at: string;
    prices: Array<{
      name: string;
      price_zone1: string;
    }>;
  };
}

export async function fetchGasPrices(): Promise<GasPrices | null> {
  try {
    const response = await axios.get<GasPrices>('https://vngas.chiraitori.io.vn/api/v1/prices');
    return response.data;
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    return null;
  }
}
