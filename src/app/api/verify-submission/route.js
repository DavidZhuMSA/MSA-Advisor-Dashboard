import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = "2022-06-28";

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { submissionId, status } = await request.json();

    if (!submissionId || !status) {
      return NextResponse.json(
        { error: "submissionId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["Verified", "Flagged", "Submitted"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const res = await fetch(`https://api.notion.com/v1/pages/${submissionId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        properties: {
          completion_status: {
            select: { name: status },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Notion update failed:", err);
      return NextResponse.json(
        { error: "Failed to update submission", details: err },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submissionId, status });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
