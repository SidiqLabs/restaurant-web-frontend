import axios from 'axios';

import { authTokenStorage } from '@/services/api/axios';

type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
};

type GeocodeErrorResponse = {
  message?: string;
};

export const geocodeAddress = async (
  address: string
): Promise<GeocodeResult> => {
  const token = authTokenStorage.get();

  if (!token) {
    throw new Error('Please sign in before detecting your location.');
  }

  try {
    const res = await axios.post<GeocodeResult>(
      '/api/geocode',
      { address },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;
  } catch (err) {
    if (axios.isAxiosError<GeocodeErrorResponse>(err)) {
      const message = err.response?.data?.message;

      if (typeof message === 'string' && message.trim()) {
        throw new Error(message);
      }
    }

    throw new Error('Failed to detect location. Please try again.');
  }
};
