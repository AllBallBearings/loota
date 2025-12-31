import { NextResponse, NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ huntId: string }> }
) {
  try {
    const { huntId } = await params;
    const requesterId = request.nextUrl.searchParams.get('userId');

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const baseUrl = request.nextUrl.clone();
    baseUrl.pathname = `/api/hunts/${huntId}`;
    if (requesterId) {
      baseUrl.searchParams.set('userId', requesterId);
    }

    const response = await fetch(baseUrl.toString(), {
      headers: {
        'X-API-Key': process.env.API_KEY_SECRET || '',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in client hunt proxy:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
