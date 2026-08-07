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

    console.log(`Identifying products from ${images.length} images...`);
    const results = [];

    for (const image of images) {
      console.log('Processing image...');
      const products = await identifyProductsFromPhoto(image);
      console.log('Products identified:', products);
      results.push(...products);
    }

    console.log('All products identified:', results);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error identifying products:', error);
    return NextResponse.json(
      { error: 'Failed to identify products', details: String(error) },
      { status: 500 }
    );
  }
}
