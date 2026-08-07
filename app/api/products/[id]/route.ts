import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // TODO: Update in Supabase
    // const { data, error } = await supabase
    //   .from('products')
    //   .update(body)
    //   .eq('id', params.id)
    //   .select();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Delete from Supabase
    // const { error } = await supabase
    //   .from('products')
    //   .delete()
    //   .eq('id', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 400 }
    );
  }
}
