import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtractedData, Category } from '@/types';

const apiKey =
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

const MODEL_CANDIDATES = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
];

/** Modelo indisponível para esta chave — vale tentar o próximo da lista. */
function isModelUnavailable(message: string): boolean {
  if (message.includes('404') || message.includes('not found')) return true;

  // 429 com "limit: 0" não é rajada de requisições: é free tier bloqueado
  // para aquele modelo. Outro modelo pode estar liberado.
  if (message.includes('429') && /limit:\s*0\b/.test(message)) return true;

  return false;
}

/** Transforma o erro cru da API (um JSON enorme) em algo legível na tela. */
function friendlyError(message: string): string {
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    return 'Chave do Gemini inválida. Gere uma nova em https://aistudio.google.com/app/apikey e coloque em GEMINI_API_KEY no .env.local';
  }

  if (message.includes('429')) {
    if (/limit:\s*0\b/.test(message)) {
      return (
        'Sua chave do Gemini não tem cota gratuita liberada para nenhum dos modelos testados ' +
        '(quota free tier = 0). Isso costuma acontecer quando o free tier não está disponível ' +
        'no país do projeto. Ative o faturamento no Google AI Studio ou use uma chave de um ' +
        'projeto com free tier: https://aistudio.google.com/app/apikey'
      );
    }

    const retry = message.match(/"retryDelay":"(\d+)s"/);
    return `Limite de requisições do Gemini atingido. Tente de novo em ${
      retry ? retry[1] : '60'
    } segundos.`;
  }

  if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
    return 'A API do Gemini recusou a chave (403). Confirme que a Generative Language API está habilitada no projeto.';
  }

  // Corta o JSON gigante que a API devolve.
  return message.length > 300 ? `${message.slice(0, 300)}...` : message;
}

/**
 * Envia imagem + prompt ao Gemini e devolve o texto da resposta.
 * Tenta os modelos em ordem: se um não estiver liberado para a chave
 * (inexistente ou sem cota), cai para o próximo.
 */
async function generateFromImage(base64Image: string, prompt: string): Promise<string> {
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY não configurada. Defina GEMINI_API_KEY (ou NEXT_PUBLIC_GEMINI_API_KEY) no .env.local'
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastMessage = '';

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
        prompt,
      ]);

      // result.response é o EnhancedGenerateContentResponse; text() está nele,
      // não no result. Era aqui que estava o bug que fazia a IA "não fazer nada".
      return result.response.text();
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
      console.error(`[gemini] modelo ${modelName} falhou:`, lastMessage.slice(0, 200));

      if (isModelUnavailable(lastMessage)) continue;

      throw new Error(friendlyError(lastMessage));
    }
  }

  throw new Error(friendlyError(lastMessage));
}

/** Extrai o primeiro bloco JSON da resposta, tolerando cercas ```json. */
function parseJson<T>(text: string, pattern: RegExp): T {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(pattern);

  if (!match) {
    throw new Error(`Gemini não retornou JSON válido. Resposta: ${text.slice(0, 300)}`);
  }

  return JSON.parse(match[0]) as T;
}

/**
 * Converte o preço vindo do Gemini para número. Prompt em português faz o
 * modelo devolver às vezes "R$ 12,50" ou "12,50" — Number() daria NaN, que
 * JSON.stringify manda como null e o banco grava como 0.
 */
export function parsePrice(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  let text = value.replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (!text) return 0;

  // "1.234,56" (pt-BR) vs "1,234.56" (en-US): manda quem vem por último.
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma > lastDot) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else {
    text = text.replace(/,/g, '');
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Aceita as variações de nome de campo que o modelo pode devolver. */
function pick(obj: Record<string, any>, keys: string[]): any {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key];
  }
  return undefined;
}

const VALID_CATEGORIES: Category[] = [
  'limpeza',
  'higiene',
  'alimentos',
  'laticinios',
  'lanches',
];

/** Categoria só é aceita se for uma das cinco; senão cai em alimentos. */
function normalizeCategory(value: unknown): Category {
  const text = String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (VALID_CATEGORIES as string[]).includes(text)
    ? (text as Category)
    : 'alimentos';
}

/** Quantidade da nota. Pode vir como "2", "1,000" (KG) ou ausente. */
function parseQuantity(value: unknown): number {
  const parsed = parsePrice(value);
  return parsed > 0 ? parsed : 1;
}

/** Normaliza a resposta do Gemini para o formato que o app espera. */
function normalizeReceipt(raw: Record<string, any>): ExtractedData {
  const rawItems = pick(raw, ['items', 'itens', 'produtos', 'products']) ?? [];

  const items = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => {
    const quantity = parseQuantity(
      pick(item, ['quantity', 'quantidade', 'qtde', 'qtd'])
    );

    // A nota pode trazer preço unitário, total, ou os dois. Se só vier o total,
    // divide pela quantidade para obter o unitário.
    const unitPriceRaw = pick(item, ['unitPrice', 'precoUnitario', 'valorUnitario', 'vlUnit']);
    const totalRaw = pick(item, ['total', 'valorTotal', 'vlTotal', 'price', 'preco', 'preço', 'valor']);

    let unitPrice = parsePrice(unitPriceRaw);
    if (unitPrice === 0) {
      const total = parsePrice(totalRaw);
      unitPrice = quantity > 0 ? total / quantity : total;
    }

    return {
      name: String(
        pick(item, ['name', 'nome', 'descricao', 'descrição', 'produto']) ?? ''
      ).trim(),
      quantity,
      unit: String(pick(item, ['unit', 'unidade', 'un']) ?? 'un').trim() || 'un',
      unitPrice,
      category: normalizeCategory(pick(item, ['category', 'categoria'])),
    };
  });

  return {
    store: String(pick(raw, ['store', 'loja', 'estabelecimento']) ?? ''),
    date: String(pick(raw, ['date', 'data', 'dataCompra']) ?? ''),
    items: items.filter((item) => item.name),
  };
}

export async function extractReceiptData(base64Image: string): Promise<ExtractedData> {
  const prompt = `Analise esta imagem de nota fiscal / cupom fiscal e extraia TODAS as informações.

Para CADA item listado na nota, extraia:
- name: descrição do produto como aparece na nota
- quantity: a QUANTIDADE da coluna "Qtde." (pode ser fracionada em produtos por peso, ex: 1.235)
- unit: a unidade da coluna "Un" (UN, KG, L, PC...)
- unitPrice: o PREÇO UNITÁRIO (coluna "Vl. Unit"), não o total da linha
- category: classifique o produto em UMA destas cinco categorias:
    limpeza     = limpeza da casa e lavanderia (detergente, sabão em pó, desinfetante...)
    higiene     = higiene pessoal e banheiro (shampoo, sabonete, papel higiênico...)
    alimentos   = alimentos básicos e mercearia (arroz, feijão, carne, frutas, legumes...)
    laticinios  = laticínios, condimentos e refrigerados (leite, queijo, iogurte, molhos...)
    lanches     = biscoitos, chocolates e lanches (bolacha, salgadinho, doces...)

REGRAS IMPORTANTES:
- Extraia TODOS os produtos listados, sem pular nenhum, inclusive os baratos
- quantity e unitPrice devem ser NÚMEROS com ponto decimal (ex: 12.50), nunca "R$ 12,50"
- Se a nota mostrar só o valor total do item, informe unitPrice = total ÷ quantidade
- Se a quantidade não aparecer, use 1
- category deve ser exatamente um destes: limpeza, higiene, alimentos, laticinios, lanches
- Converta a data para YYYY-MM-DD; se vier só dia/mês, use o ano atual

Responda APENAS com JSON válido, sem markdown e sem texto extra:
{
  "store": "nome da loja",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "DRUMET FIG CONG", "quantity": 1.328, "unit": "KG", "unitPrice": 9.98, "category": "alimentos"},
    {"name": "DETERGENTE 500ML", "quantity": 2, "unit": "UN", "unitPrice": 2.49, "category": "limpeza"}
  ]
}`;

  const text = await generateFromImage(base64Image, prompt);
  const raw = parseJson<Record<string, any>>(text, /\{[\s\S]*\}/);
  return normalizeReceipt(raw);
}

export async function extractExpiryDate(base64Image: string): Promise<string | null> {
  const prompt = `Extraia a data de validade impressa nesta embalagem de produto.
Responda APENAS com a data no formato YYYY-MM-DD, ou "null" se não encontrar.
Exemplo de resposta: 2025-12-31`;

  const text = (await generateFromImage(base64Image, prompt)).trim();

  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export async function extractTextFromImage(base64Image: string): Promise<string> {
  return generateFromImage(
    base64Image,
    'Extraia todo o texto visível nesta imagem. Responda apenas com o texto, sem explicações.'
  );
}
