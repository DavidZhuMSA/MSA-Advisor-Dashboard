import { auth } from "@/lib/auth";
import { getPendingSubmissions, getActiveClients } from "@/lib/notion";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.notionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const advisorId = session.user.notionId;

    // Fetch pending submissions and clients in parallel
    const [submissions, clients] = await Promise.all([
      getPendingSubmissions(),
      getActiveClients(),
    ]);

    // Build a map of clientId -> client for quick lookup
    const clientMap = {};
    const advisorClientIds = new Set();
    for (const c of clients) {
      clientMap[c.id] = c;
      if (c.advisorId === advisorId) {
        advisorClientIds.add(c.id);
      }
    }

    // Filter submissions to only this advisor's clients
    const pendingSubmissions = submissions
      .filter((s) => advisorClientIds.has(s.clientId))
      .map((s) => ({
        ...s,
        clientName: clientMap[s.clientId]?.name || "Unknown",
      }));

    // Find overdue clients (this advisor's only)
    const advisorClients = clients.filter((c) => c.advisorId === advisorId);
    const overdueSnapshots = advisorClients
      .filter((c) => c.daysSinceLastSnapshot != null && c.daysSinceLastSnapshot > 7)
      .map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        daysSince: c.daysSinceLastSnapshot,
        type: "snapshot",
      }));

    const overdueArchitecture = advisorClients
      .filter((c) => c.daysSinceLastArchitecture != null && c.daysSinceLastArchitecture > 14)
      .map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        daysSince: c.daysSinceLastArchitecture,
        type: "architecture",
      }));

    const res = NextResponse.json({
      pendingSubmissions,
      overdueSnapshots,
      overdueArchitecture,
      totalActionItems:
        pendingSubmissions.length +
        overdueSnapshots.length +
        overdueArchitecture.length,
    });
    res.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    return res;
  } catch (error) {
    console.error("Error fetching action items:", error);
    return NextResponse.json(
      { error: "Failed to fetch action items" },
      { status: 500 }
    );
  }
}
