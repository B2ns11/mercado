import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, describeSupabaseError } from '@/lib/supabase';
import { CATEGORIES } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Gastos por categoria no mês: soma preço × quantidade dos produtos
 * cadastrados dentro do período.
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const month = Number(params.get('month')) || new Date().getMonth() + 1;
    const year = Number(params.get('year')) || new Date().getFullYear();

    // Date.UTC evita o deslocamento de fuso: new Date(ano, mes, 1) monta o
    // limite em hora local e o toISOString() empurra para outro dia, cortando
    // registros das primeiras horas do mês.
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const end = new Date(Date.UTC(year, month, 1)).toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('category, price, quantity, created_at')
      .gte('created_at', start)
      .lt('created_at', end);

    if (error) throw error;

    const totals: Record<string, number> = {};
    Object.keys(CATEGORIES).forEach((cat) => {
      totals[cat] = 0;
    });

    let totalAmount = 0;
    for (const row of data ?? []) {
      const value = Number(row.price ?? 0) * Number(row.quantity ?? 1);
      if (row.category in totals) totals[row.category] += value;
      totalAmount += value;
    }

    const categories = Object.keys(CATEGORIES).reduce((acc, cat) => {
      acc[cat] = {
        amount: totals[cat],
        percentage: totalAmount > 0 ? (totals[cat] / totalAmount) * 100 : 0,
      };
      return acc;
    }, {} as Record<string, { amount: number; percentage: number }>);

    // Quantos produtos existem no total, ignorando o filtro de mês. Se houver
    // produtos mas o mês vier zerado, o problema é a data — não o preço.
    const { count: totalNoBanco } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const linhas = data ?? [];
    const semPreco = linhas.filter((r) => !Number(r.price)).length;

    return NextResponse.json({
      month: String(month),
      year,
      categories,
      totalAmount,
      diagnostico: {
        produtosNoMes: linhas.length,
        produtosNoBanco: totalNoBanco ?? 0,
        produtosComPrecoZero: semPreco,
        periodo: { de: start, ate: end },
      },
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    return NextResponse.json(
      { error: describeSupabaseError(error) || 'Falha ao calcular análises' },
      { status: 500 }
    );
  }
}
