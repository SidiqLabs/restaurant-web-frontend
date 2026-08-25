// src/types/location.ts

export type DeliveryLocationDraft = {
  formattedAddress: string;
  addressDetail?: string;
  latitude: number;
  longitude: number;
  updatedAt: string; // ISO
};
