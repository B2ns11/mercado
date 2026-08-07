import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedData, Category } from '@/types';

const genAI = new GoogleGenerativeAI(
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
);

function extractText(response: any): string {
  if (response.text) {
    return response.text();
  }
  if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  return '';
}

export async function extractReceiptData(base64Image: string): Promise<ExtractedData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this receipt/invoice image carefully and extract ALL information:

1. **Store/Establishment name** - The company/store name
2. **Purchase date** - The transaction date (convert to YYYY-MM-DD format)
3. **ALL items listed** - Every product with its individual price
4. **Total amount** - The final total (sum should match all items)

IMPORTANT:
- Extract EVERY product listed on the receipt
- If there are quantity × price, calculate the individual item price
- Include all items even if small/cheap
- For date: if only day/month given, use current year or context year
- Format prices as numbers (e.g., 12.50 not "R$ 12,50")

Return ONLY valid JSON, no markdown, no extra text:
{
  "store": "store name here",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "product 1 name", "price": 10.50},
    {"name": "product 2 name", "price": 5.25}
  ],
  "totalAmount": 15.75
}`;

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    prompt,
  ]);

  const text = extractText(response);
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('Could not match JSON in response:', text);
    throw new Error('Could not extract receipt data');
  }

  return JSON.parse(jsonMatch[0]) as ExtractedData;
}

export async function identifyProductsFromPhoto(
  base64Image: string
): Promise<Array<{ name: string; category: Category }>> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  const text = extractText(response);
  const jsonMatch = text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    return [];
  }

  return JSON.parse(jsonMatch[0]) as Array<{ name: string; category: Category }>;
}

export async function extractExpiryDate(base64Image: string): Promise<string | null> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  const text = extractText(response).trim();

  if (text === 'null') {
    return null;
  }

  const dateRegex = /\d{4}-\d{2}-\d{2}/;
  const match = text.match(dateRegex);

  return match ? match[0] : null;
}

export async function extractTextFromImage(base64Image: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const response = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    },
    'Extract all text visible in this image. Return only the text, no explanations.',
  ]);

  return extractText(response);
}
