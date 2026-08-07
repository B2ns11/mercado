import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
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

    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('category, price, quantity')
      .gte('created_at', start)
      .lt('created_at', end);

    if (error) throw new Error(error.message);

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

    return NextResponse.json({
      month: String(month),
      year,
      categories,
      totalAmount,
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    return NextResponse.json(
      { error: 'Falha ao calcular análises', details: String(error) },
      { status: 500 }
    );
  }
}
