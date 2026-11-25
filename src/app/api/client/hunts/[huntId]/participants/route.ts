import { NextResponse, NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;
    const body = await request.json();

    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = `/api/hunts/${huntId}/participants`;
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
    console.error('Error in client participants POST proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;
    const userId = request.nextUrl.searchParams.get('userId');

    const targetUrl = request.nextUrl.clone();
    targetUrl.pathname = `/api/hunts/${huntId}/participants`;
    targetUrl.search = userId ? `?userId=${encodeURIComponent(userId)}` : '';

    const response = await fetch(targetUrl.toString(), {
      method: 'DELETE',
      headers: {
        'X-API-Key': process.env.API_KEY_SECRET || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in client participants DELETE proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
