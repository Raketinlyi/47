import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose PUBLIC variables
  const payload = {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? null,
    NEXT_PUBLIC_WEB3_MODAL_ENABLED:
      process.env.NEXT_PUBLIC_WEB3_MODAL_ENABLED ?? null,
    NEXT_PUBLIC_MONAD_RPC: process.env.NEXT_PUBLIC_MONAD_RPC ?? null,
    NEXT_PUBLIC_ALCHEMY_API_KEY_1: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY_1
      ? 'present'
      : null,
  };

  return NextResponse.json(payload);
}
