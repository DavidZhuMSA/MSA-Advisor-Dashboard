import { auth } from "@/lib/auth";
import {
  getClientById,
  getPerformanceSnapshots,
  getArchitectureSubmissions,
} from "@/lib/notion";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.notionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [client, snapshots, submissions] = await Promise.all([
      getClientById(id),
      getPerformanceSnapshots(id),
      getArchitectureSubmissions(id),
    ]);

    const res = NextResponse.json({ client, snapshots, submissions });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  } catch (error) {
    console.error("Error fetching client detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch client detail" },
      { status: 500 }
    );
  }
}
