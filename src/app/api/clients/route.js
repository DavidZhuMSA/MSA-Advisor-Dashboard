import { auth } from "@/lib/auth";
import { getActiveClients } from "@/lib/notion";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.notionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allClients = await getActiveClients();

    // Filter to only this advisor's clients
    const advisorId = session.user.notionId;
    const clients = allClients.filter((c) => c.advisorId === advisorId);

    const res = NextResponse.json({ clients });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
