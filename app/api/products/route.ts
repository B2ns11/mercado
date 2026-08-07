import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getDefaultUserId, describeSupabaseError } from '@/lib/supabase';
import type { Product } from '@/types';

/** Converte a linha do Postgres (snake_case) para o tipo usado no front. */
function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    price: Number(row.price),
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
    userId: row.user_id,
  };
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json((data ?? []).map(toProduct));
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: describeSupabaseError(error) || 'Falha ao carregar produtos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'name e category são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          user_id: body.userId ?? (await getDefaultUserId()),
          name: body.name,
          category: body.category,
          quantity: body.quantity ?? 1,
          unit: body.unit ?? 'un',
          price: body.price ?? 0,
          expiry_date: body.expiryDate ?? null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toProduct(data), { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: describeSupabaseError(error) || 'Falha ao criar produto' },
      { status: 500 }
    );
  }
}
