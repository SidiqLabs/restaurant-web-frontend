import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_GEOCODE_URL =
  'https://maps.googleapis.com/maps/api/geocode/json';

const MIN_ADDRESS_LENGTH = 6;
const MAX_ADDRESS_LENGTH = 200;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getGoogleResult = (payload: unknown) => {
  if (!isRecord(payload)) return null;

  const status = payload.status;
  const results = payload.results;

  if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
    return null;
  }

  const first = results[0];
  if (!isRecord(first)) return null;

  const formattedAddress = first.formatted_address;
  const geometry = first.geometry;

  if (typeof formattedAddress !== 'string' || !isRecord(geometry)) {
    return null;
  }

  const location = geometry.location;
  if (!isRecord(location)) return null;

  const lat = location.lat;
  const lng = location.lng;

  if (
    typeof lat !== 'number' ||
    !Number.isFinite(lat) ||
    typeof lng !== 'number' ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return {
    latitude: lat,
    longitude: lng,
    formattedAddress,
  };
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { message: 'Address is required.' },
      { status: 400 }
    );
  }

  let lookup: { address: string } | { latlng: string };
  if (typeof body.address === 'string') {
    const address = body.address.trim();
    if (
      address.length < MIN_ADDRESS_LENGTH ||
      address.length > MAX_ADDRESS_LENGTH
    ) {
      return NextResponse.json(
        { message: `Address must be between ${MIN_ADDRESS_LENGTH} and ${MAX_ADDRESS_LENGTH} characters.` },
        { status: 400 }
      );
    }
    lookup = { address };
  } else if (
    typeof body.latitude === 'number' && Number.isFinite(body.latitude) &&
    Math.abs(body.latitude) <= 90 &&
    typeof body.longitude === 'number' && Number.isFinite(body.longitude) &&
    Math.abs(body.longitude) <= 180
  ) {
    lookup = { latlng: `${body.latitude},${body.longitude}` };
  } else {
    return NextResponse.json(
      { message: 'A valid address or coordinates are required.' },
      { status: 400 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: 'Location service is not configured.' },
      { status: 503 }
    );
  }

  try {
    const profileResponse = await fetch(`${apiBaseUrl}/api/auth/profile`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
      cache: 'no-store',
    });

    if (profileResponse.status === 401 || profileResponse.status === 403) {
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (!profileResponse.ok) {
      return NextResponse.json(
        { message: 'Unable to verify authentication.' },
        { status: 502 }
      );
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
      return NextResponse.json(
        { message: 'Location service is not configured.' },
        { status: 503 }
      );
    }

    const params = new URLSearchParams({
      ...lookup,
      key: googleApiKey,
    });

    const googleResponse = await fetch(
      `${GOOGLE_GEOCODE_URL}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!googleResponse.ok) {
      return NextResponse.json(
        { message: 'Location lookup failed.' },
        { status: 502 }
      );
    }

    const googlePayload: unknown = await googleResponse.json();
    const result = getGoogleResult(googlePayload);

    if (!result) {
      return NextResponse.json(
        { message: 'Address not found. Please refine your input.' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { message: 'Location service is temporarily unavailable.' },
      { status: 502 }
    );
  }
}
