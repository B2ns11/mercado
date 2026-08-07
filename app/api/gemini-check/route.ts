import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico: lista os modelos que a chave configurada consegue enxergar.
 * Abra /api/gemini-check no navegador quando a IA reclamar de cota ou modelo.
 */
export async function GET() {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'GEMINI_API_KEY não configurada. Defina GEMINI_API_KEY no .env.local e reinicie o servidor.',
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: response.status,
          error: data?.error?.message ?? 'Falha ao listar modelos',
        },
        { status: 500 }
      );
    }

    // Só os modelos que aceitam generateContent (os que este app usa).
    const models = (data.models ?? [])
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name?.replace('models/', ''));

    return NextResponse.json({
      ok: true,
      keyPreview: `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`,
      totalModels: models.length,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
