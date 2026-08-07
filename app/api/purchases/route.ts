import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  // TODO: Implement authentication and fetch from Supabase
  // const { data, error } = await supabase
  //   .from('purchases')
  //   .select('*, products(*)')
  //   .order('created_at', { ascending: false });

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Save to Supabase with products
    // const { data, error } = await supabase
    //   .from('purchases')
    //   .insert([body])
    //   .select();

    return NextResponse.json({ id: 'temp-id' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create purchase' },
      { status: 400 }
    );
  }
}
