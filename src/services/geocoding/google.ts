import axios from 'axios';

import { authTokenStorage } from '@/services/api/axios';
import type { GeocodeResult } from '@/types/location';

type GeocodeErrorResponse = {
  message?: string;
};

const requestGeocode = async (
  input: { address: string } | { latitude: number; longitude: number }
): Promise<GeocodeResult> => {
  const token = authTokenStorage.get();

  if (!token) {
    throw new Error('Please sign in before detecting your location.');
  }

  try {
    const res = await axios.post<GeocodeResult>(
      '/api/geocode',
      input,
      {
        timeout: 15000,
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

export const geocodeAddress = (address: string): Promise<GeocodeResult> =>
  requestGeocode({ address });

export const reverseGeocode = (
  latitude: number,
  longitude: number
): Promise<GeocodeResult> => requestGeocode({ latitude, longitude });
