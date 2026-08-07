import { NextRequest, NextResponse } from 'next/server';
import { extractExpiryDate } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    console.log('Extracting expiry date from image...');
    const expiryDate = await extractExpiryDate(image);
    console.log('Expiry date extracted:', expiryDate);

    return NextResponse.json({ expiryDate });
  } catch (error) {
    console.error('Error extracting expiry date:', error);
    return NextResponse.json(
      { error: 'Failed to extract expiry date', details: String(error) },
      { status: 500 }
    );
  }
}
