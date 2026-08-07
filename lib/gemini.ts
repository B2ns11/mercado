import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedData, Category } from '@/types';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
);

export async function extractReceiptData(base64Image: string): Promise<ExtractedData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const prompt = `Analyze this receipt image and extract:
1. Store/establishment name
2. Purchase date
3. List of items and their individual prices

Return as JSON with structure: {
  "store": "store name",
  "date": "YYYY-MM-DD",
  "items": [{"name": "product name", "price": number}]
}

Only return valid JSON, no additional text.`;

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    prompt,
  ]);

  const text = response.response.getText();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Could not extract receipt data');
  }

  return JSON.parse(jsonMatch[0]) as ExtractedData;
}

export async function identifyProductsFromPhoto(
  base64Image: string
): Promise<Array<{ name: string; category: Category }>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const categories = [
    'limpeza (House cleaning and laundry)',
    'higiene (Personal hygiene and bathroom)',
    'alimentos (Basic food and grocery)',
    'laticinios (Dairy, seasonings and refrigerated)',
    'lanches (Cookies, chocolate and snacks)',
  ];

  const prompt = `Identify all visible products in this image and categorize them.

Categories available:
${categories.join('\n')}

Return as JSON array with structure: [
  {"name": "product name", "category": "category_id"}
]

Use only these category IDs: limpeza, higiene, alimentos, laticinios, lanches

Only return valid JSON, no additional text.`;

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    prompt,
  ]);

  const text = response.response.getText();
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    return [];
  }

  return JSON.parse(jsonMatch[0]) as Array<{ name: string; category: Category }>;
}

export async function extractExpiryDate(base64Image: string): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const prompt = `Extract the expiry/validity date from this product label image.
Return only the date in YYYY-MM-DD format or null if not found.
Example: 2025-12-31

Only return the date or "null", nothing else.`;

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    prompt,
  ]);

  const text = response.response.getText().trim();

  if (text === 'null') {
    return null;
  }

  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const match = text.match(dateRegex);

  return match ? match[0] : null;
}

export async function extractText(base64Image: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    'Extract all text visible in this image. Return only the text, no explanations.',
  ]);

  return response.response.getText();
}
