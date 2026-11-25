import { NextResponse } from 'next/server';
import { DESIGN_TOKENS, AR_GAMEPLAY_CONFIG } from '@/lib/ar/experienceConfig';

export async function GET() {
  return NextResponse.json(
    {
      designTokens: DESIGN_TOKENS,
      arGameplay: AR_GAMEPLAY_CONFIG,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}
