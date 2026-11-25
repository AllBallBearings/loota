import { NextResponse, NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string; pinId: string }> }
) {
  try {
    const { huntId, pinId } = await params;
    const body = await request.json();

    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = `/api/hunts/${huntId}/pins/${pinId}/collect`;
    targetUrl.search = '';

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY_SECRET || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in client collect proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
