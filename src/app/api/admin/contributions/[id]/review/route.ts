import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { reviewCommunityContribution } from "@/lib/contributor-rewards";
import { getMissingContributionModerationMessage, isMissingTableError } from "@/lib/supabase-errors";
import { getAdminSupabase } from "@/lib/supabase-server";

type ReviewBody = {
  action?: "approve" | "reject";
  pointsAwarded?: number | null;
  reviewNotes?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getOptionalAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const contributionId = Number(id);
    const body = (await request.json().catch(() => ({}))) as ReviewBody;

    if (!Number.isFinite(contributionId) || contributionId <= 0) {
      return NextResponse.json({ error: "Contribucion invalida." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const { data: currentContribution, error: contributionError } = await supabase
      .from("community_contributions")
      .select("id,source_id,source_type")
      .eq("id", contributionId)
      .single();

    if (isMissingTableError(contributionError, "community_contributions")) {
      return NextResponse.json({ error: getMissingContributionModerationMessage() }, { status: 400 });
    }

    if (contributionError || !currentContribution) {
      return NextResponse.json(
        { error: contributionError?.message || "Contribucion no encontrada." },
        { status: 404 }
      );
    }

    const contribution = await reviewCommunityContribution({
      action: body.action === "reject" ? "reject" : "approve",
      contributionId,
      pointsAwarded: body.pointsAwarded ?? null,
      reviewNotes: body.reviewNotes ?? null,
      reviewerEmail: session.email,
    });

    if (currentContribution.source_type === "place_report") {
      await supabase
        .from("place_reports")
        .update({
          review_notes: body.reviewNotes?.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by_email: session.email,
          status: contribution.status === "approved" ? "approved" : "rejected",
        })
        .eq("id", currentContribution.source_id);
    }

    return NextResponse.json({ contribution, ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo revisar la contribucion.",
      },
      { status: 500 }
    );
  }
}
