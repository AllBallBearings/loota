import { NextResponse, NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { huntId: string } }
) {
  try {
    const { huntId } = params;
    const body = await request.json();

    if (!huntId) {
      return NextResponse.json({ message: 'Hunt ID is required' }, { status: 400 });
    }

    const baseUrl = request.nextUrl.clone();
    baseUrl.pathname = `/api/hunts/${huntId}/reset`;

    const response = await fetch(baseUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY_SECRET || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in client hunt reset proxy:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
