// src/lib/delivery-location.ts
import type { DeliveryLocationDraft } from '@/types/location';

export const DELIVERY_LOCATION_KEY = 'foody_delivery_location_v1';
export const DELIVERY_LOCATION_EVENT = 'foody-delivery-location';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const readDeliveryLocationDraft = (): DeliveryLocationDraft | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DELIVERY_LOCATION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;

    const formattedAddress = parsed.formattedAddress;
    const addressDetail = parsed.addressDetail;
    const latitude = parsed.latitude;
    const longitude = parsed.longitude;
    const updatedAt = parsed.updatedAt;

    if (typeof formattedAddress !== 'string' || formattedAddress.trim() === '')
      return null;
    if (
      addressDetail !== undefined &&
      typeof addressDetail !== 'string'
    )
      return null;
    // Manual delivery addresses have no coordinates; never invent a location.
    if (latitude !== undefined || longitude !== undefined) {
      if (
        typeof latitude !== 'number' || !Number.isFinite(latitude) ||
        Math.abs(latitude) > 90 ||
        typeof longitude !== 'number' || !Number.isFinite(longitude) ||
        Math.abs(longitude) > 180
      ) return null;
    }
    if (typeof updatedAt !== 'string' || updatedAt.trim() === '') return null;

    return {
      formattedAddress,
      addressDetail:
        typeof addressDetail === 'string' && addressDetail.trim()
          ? addressDetail.trim()
          : undefined,
      latitude,
      longitude,
      updatedAt,
    };
  } catch {
    return null;
  }
};

export const formatDeliveryAddress = (
  draft: DeliveryLocationDraft
): string => {
  const base = draft.formattedAddress.trim();
  const detail = draft.addressDetail?.trim();

  return detail ? `${base}, ${detail}` : base;
};
