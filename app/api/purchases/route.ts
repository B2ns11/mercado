import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, DEFAULT_USER_ID } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Primeiro e último dia do mês, em YYYY-MM-DD. */
function monthRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const month = Number(params.get('month'));
    const year = Number(params.get('year'));

    const supabase = getSupabase();
    let query = supabase
      .from('purchases')
      .select('*')
      .order('receipt_date', { ascending: false });

    if (month && year) {
      const { start, end } = monthRange(month, year);
      query = query.gte('receipt_date', start).lte('receipt_date', end);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const purchases = (data ?? []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      receiptPhoto: row.receipt_photo,
      receiptDate: row.receipt_date,
      totalAmount: Number(row.total_amount),
      createdAt: row.created_at,
      products: [],
    }));

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao carregar compras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId ?? DEFAULT_USER_ID;
    const products: any[] = body.products ?? [];

    if (!body.receiptDate) {
      return NextResponse.json(
        { error: 'receiptDate é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const totalAmount =
      body.totalAmount ??
      products.reduce((sum, p) => sum + Number(p.price ?? 0) * Number(p.quantity ?? 1), 0);

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert([
        {
          user_id: userId,
          receipt_photo: body.receiptPhoto ?? '',
          receipt_date: body.receiptDate,
          total_amount: totalAmount,
        },
      ])
      .select()
      .single();

    if (purchaseError) throw new Error(purchaseError.message);

    // Os produtos da compra entram no estoque.
    if (products.length > 0) {
      const rows = products.map((p) => ({
        user_id: userId,
        name: p.name,
        category: p.category,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? 'un',
        price: p.price ?? 0,
        expiry_date: p.expiryDate ?? null,
      }));

      const { error: productsError } = await supabase.from('products').insert(rows);
      if (productsError) throw new Error(productsError.message);
    }

    return NextResponse.json({ id: purchase.id, totalAmount }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao salvar compra' },
      { status: 500 }
    );
  }
}
