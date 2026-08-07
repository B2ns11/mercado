import { NextRequest, NextResponse } from 'next/server';
import { identifyProductsFromPhoto } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images array is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const image of images) {
      const products = await identifyProductsFromPhoto(image);
      results.push(...products);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error identifying products:', error);
    return NextResponse.json(
      { error: 'Failed to identify products' },
      { status: 500 }
    );
  }
}
