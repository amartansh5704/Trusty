import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { getWalletTransactions } from "@/services/wallet.service";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await getWalletTransactions(user.id);

    return NextResponse.json({
      walletBalance: user.walletBalance,
      transactions,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}