import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const huntId = searchParams.get('huntId');
  
  if (!huntId) {
    return NextResponse.json({ error: 'Hunt ID is required' }, { status: 400 });
  }

  // Generate the universal link
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://loota-seven.vercel.app';
  const universalLink = `${baseUrl}/hunt/${huntId}`;
  
  return NextResponse.json({ 
    universalLink,
    huntId,
    message: 'Universal link generated successfully'
  });
}
