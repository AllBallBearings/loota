import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test endpoint
 *     description: This is a simple test endpoint.
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET() {
  return NextResponse.json({ message: 'Hello from test API' });
}
