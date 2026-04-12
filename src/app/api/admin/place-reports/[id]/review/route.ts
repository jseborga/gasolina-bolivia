import { NextRequest, NextResponse } from "next/server";
import { getOptionalAdminSession } from "@/lib/admin-auth";
import { reviewCommunityContribution } from "@/lib/contributor-rewards";
import {
  getMissingContributionModerationMessage,
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/supabase-errors";
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
    const reportId = Number(id);
    const body = (await request.json().catch(() => ({}))) as ReviewBody;
    const action = body.action === "reject" ? "reject" : "approve";

    if (!Number.isFinite(reportId) || reportId <= 0) {
      return NextResponse.json({ error: "Denuncia invalida." }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    const reviewedAt = new Date().toISOString();
    const nextStatus = action === "approve" ? "approved" : "rejected";
    const { data: updatedReport, error: reportError } = await supabase
      .from("place_reports")
      .update({
        review_notes: body.reviewNotes?.trim() || null,
        reviewed_at: reviewedAt,
        reviewed_by_email: session.email,
        status: nextStatus,
      })
      .eq("id", reportId)
      .select("*")
      .single();

    if (isMissingTableError(reportError, "place_reports")) {
      return NextResponse.json(
        { error: "Falta la tabla place_reports. Ejecuta la migracion supabase/008_place_reports.sql." },
        { status: 400 }
      );
    }

    if (
      isMissingColumnError(reportError, "place_reports", [
        "status",
        "review_notes",
        "reviewed_at",
        "reviewed_by_email",
      ])
    ) {
      return NextResponse.json(
        { error: getMissingContributionModerationMessage() },
        { status: 400 }
      );
    }

    if (reportError || !updatedReport) {
      return NextResponse.json(
        { error: reportError?.message || "No se pudo revisar la denuncia." },
        { status: 400 }
      );
    }

    const { data: contribution } = await supabase
      .from("community_contributions")
      .select("id")
      .eq("source_type", "place_report")
      .eq("source_id", reportId)
      .maybeSingle();

    if (contribution?.id != null) {
      try {
        await reviewCommunityContribution({
          action,
          contributionId: Number(contribution.id),
          pointsAwarded: body.pointsAwarded ?? null,
          reviewNotes: body.reviewNotes ?? null,
          reviewerEmail: session.email,
        });
      } catch (contributionError) {
        if (
          contributionError instanceof Error &&
          !contributionError.message.toLowerCase().includes("community_contributions")
        ) {
          throw contributionError;
        }
      }
    }

    return NextResponse.json({ ok: true, report: updatedReport });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar la denuncia.",
      },
      { status: 500 }
    );
  }
}
