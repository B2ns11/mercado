import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: Implement authentication and fetch from Supabase
  // const { data, error } = await supabase
  //   .from('products')
  //   .select('*')
  //   .order('created_at', { ascending: false });

  return NextResponse.json([]);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Save to Supabase
    // const { data, error } = await supabase
    //   .from('products')
    //   .insert([body])
    //   .select();

    return NextResponse.json({ id: 'temp-id' }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 400 }
    );
  }
}
