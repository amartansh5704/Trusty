import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { createTopUpRequest, getTopUpsByUser } from "@/services/wallet.service";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topUps = await getTopUpsByUser(user.id);
    return NextResponse.json({ topUps });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch top-ups" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, utrNumber, screenshotUrl } = body;

    if (!amount || Number(amount) < 100) {
      return NextResponse.json(
        { error: "Minimum top-up amount is ₹100" },
        { status: 400 }
      );
    }

    if (Number(amount) > 100000) {
      return NextResponse.json(
        { error: "Maximum top-up amount is ₹1,00,000" },
        { status: 400 }
      );
    }

    if (!utrNumber || utrNumber.trim().length < 6) {
      return NextResponse.json(
        { error: "Valid UTR number is required (minimum 6 characters)" },
        { status: 400 }
      );
    }

    const topUp = await createTopUpRequest({
      userId: user.id,
      amount: Number(amount),
      utrNumber: utrNumber.trim(),
      screenshotUrl: screenshotUrl?.trim() || undefined,
    });

    return NextResponse.json({ topUp }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to submit top-up request" },
      { status: 500 }
    );
  }
}