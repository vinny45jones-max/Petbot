import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

export async function GET() {
  try {
    const payload = await getPayload({ config });
    await payload.find({ collection: 'cities', limit: 1 });
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', error: e.message }, { status: 503 });
  }
}
