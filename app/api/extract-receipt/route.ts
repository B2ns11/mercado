import { NextRequest, NextResponse } from 'next/server';
import { extractReceiptData } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    console.log('Extracting receipt data from image...');
    const extractedData = await extractReceiptData(image);
    console.log('Receipt data extracted:', extractedData);

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error('Error extracting receipt data:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Falha ao ler a nota fiscal',
      },
      { status: 500 }
    );
  }
}
