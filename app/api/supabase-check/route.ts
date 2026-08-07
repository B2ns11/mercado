import { NextResponse } from 'next/server';
import {
  getSupabase,
  usingServiceRole,
  describeSupabaseError,
  getDefaultUserId,
} from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico do banco: confere leitura nas duas tabelas e testa uma gravação
 * real (que é desfeita em seguida) para detectar bloqueio de RLS antes de o
 * usuário chegar na última etapa do fluxo de compra.
 */
export async function GET() {
  const result: Record<string, unknown> = {
    usandoServiceRole: usingServiceRole,
  };

  let supabase;
  try {
    supabase = getSupabase();
  } catch (error) {
    return NextResponse.json(
      { ok: false, erro: describeSupabaseError(error) },
      { status: 500 }
    );
  }

  // Leitura
  for (const table of ['products', 'purchases']) {
    const { error } = await supabase.from(table).select('id').limit(1);
    result[`leitura_${table}`] = error ? describeSupabaseError(error) : 'ok';
  }

  // Resolve (ou cria) o usuário local — é o que satisfaz a FK para auth.users.
  let userId: string;
  try {
    userId = await getDefaultUserId();
    result.usuarioLocal = userId;
  } catch (error) {
    return NextResponse.json(
      { ok: false, ...result, usuarioLocal: describeSupabaseError(error) },
      { status: 500 }
    );
  }

  // Gravação real, desfeita logo em seguida.
  const { data, error: insertError } = await supabase
    .from('purchases')
    .insert([
      {
        user_id: userId,
        receipt_photo: '',
        receipt_date: new Date().toISOString().slice(0, 10),
        total_amount: 0,
      },
    ])
    .select()
    .single();

  if (insertError) {
    result.gravacao_purchases = describeSupabaseError(insertError);
  } else {
    result.gravacao_purchases = 'ok';
    await supabase.from('purchases').delete().eq('id', data.id);
    result.limpezaDoTeste = 'registro de teste removido';
  }

  const ok = Object.entries(result)
    .filter(([key]) => key.startsWith('leitura_') || key.startsWith('gravacao_'))
    .every(([, value]) => value === 'ok');

  return NextResponse.json({ ok, ...result });
}
