import { getAdminSupabase } from "@/lib/supabase-server";
import type {
  AppProfile,
  AppProfileRole,
  CommunityContribution,
  CommunityContributionSource,
  CommunityContributionStatus,
} from "@/lib/types";

const CONTRIBUTION_POINTS: Record<CommunityContributionSource, number> = {
  fuel_report: 2,
  parking_update: 3,
  place_report: 4,
  traffic_incident: 5,
};

const DUPLICATE_WINDOWS_MINUTES: Record<CommunityContributionSource, number> = {
  fuel_report: 60,
  parking_update: 20,
  place_report: 24 * 60,
  traffic_incident: 180,
};

const APPROVAL_RELIABILITY_DELTA = 0.6;
const REJECTION_RELIABILITY_DELTA = -1;

function clampReliabilityScore(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(1))));
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeNonNegativeInteger(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function parseRiskFlags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toContribution(row: Record<string, unknown>) {
  return {
    ...(row as unknown as CommunityContribution),
    risk_flags: parseRiskFlags(row.risk_flags),
  };
}

export function getSuggestedPointsForContribution(sourceType: CommunityContributionSource) {
  return CONTRIBUTION_POINTS[sourceType] ?? 0;
}

export async function resolveContributorProfileByToken(token?: string | null) {
  const normalizedToken = normalizeNullableText(token);
  if (!normalizedToken) return null;

  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("app_profiles")
    .select("*")
    .eq("manager_access_token", normalizedToken)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AppProfile;
}

type RegisterContributionInput = {
  appProfileId?: number | null;
  contributorRole?: AppProfileRole | null;
  contributorToken?: string | null;
  duplicateSignature?: string | null;
  initialStatus?: CommunityContributionStatus;
  ipAddress?: string | null;
  latitudeBucket?: number | null;
  longitudeBucket?: number | null;
  metadata?: Record<string, unknown> | null;
  pointsSuggested?: number | null;
  sourceId: number;
  sourceType: CommunityContributionSource;
  visitorId?: string | null;
};

export async function registerCommunityContribution(input: RegisterContributionInput) {
  const supabase = getAdminSupabase();
  const resolvedProfile =
    input.appProfileId != null
      ? null
      : await resolveContributorProfileByToken(input.contributorToken ?? null);
  const appProfileId = input.appProfileId ?? resolvedProfile?.id ?? null;
  const contributorRole = input.contributorRole ?? resolvedProfile?.role ?? null;

  if (appProfileId == null) {
    return null;
  }

  const duplicateSignature = normalizeNullableText(input.duplicateSignature);
  const sourceType = input.sourceType;
  const riskFlags = new Set<string>();

  if (duplicateSignature) {
    const duplicateWindowStart = new Date(
      Date.now() - DUPLICATE_WINDOWS_MINUTES[sourceType] * 60 * 1000
    ).toISOString();

    const { data: recentMatches } = await supabase
      .from("community_contributions")
      .select("id,app_profile_id,ip_address")
      .eq("source_type", sourceType)
      .eq("duplicate_signature", duplicateSignature)
      .gte("created_at", duplicateWindowStart)
      .neq("source_id", input.sourceId)
      .limit(12);

    const matches = recentMatches ?? [];
    if (matches.length > 0) {
      riskFlags.add("possible_duplicate");
    }

    if (matches.some((item) => item.app_profile_id === appProfileId)) {
      riskFlags.add("same_profile_repeat");
    }

    if (
      input.ipAddress &&
      matches.some((item) => item.ip_address && item.ip_address === input.ipAddress)
    ) {
      riskFlags.add("same_ip_cluster");
    }
  }

  const nextStatus =
    input.initialStatus ??
    (riskFlags.size >= 2 ? "auto_flagged" : "pending");

  const { data, error } = await supabase
    .from("community_contributions")
    .upsert(
      {
        app_profile_id: appProfileId,
        contributor_role: contributorRole,
        duplicate_signature: duplicateSignature,
        ip_address: normalizeNullableText(input.ipAddress),
        latitude_bucket: input.latitudeBucket ?? null,
        longitude_bucket: input.longitudeBucket ?? null,
        metadata: input.metadata ?? {},
        points_suggested: normalizeNonNegativeInteger(
          input.pointsSuggested ?? getSuggestedPointsForContribution(sourceType)
        ),
        risk_flags: Array.from(riskFlags),
        source_id: input.sourceId,
        source_type: sourceType,
        status: nextStatus,
        visitor_id: normalizeNullableText(input.visitorId),
      },
      { onConflict: "source_type,source_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo registrar la contribucion.");
  }

  return toContribution(data as Record<string, unknown>);
}

type ReviewContributionInput = {
  action: "approve" | "reject";
  contributionId: number;
  pointsAwarded?: number | null;
  reviewNotes?: string | null;
  reviewerEmail: string;
};

export async function reviewCommunityContribution(input: ReviewContributionInput) {
  const supabase = getAdminSupabase();
  const { data: contributionRow, error: contributionError } = await supabase
    .from("community_contributions")
    .select("*")
    .eq("id", input.contributionId)
    .single();

  if (contributionError || !contributionRow) {
    throw new Error(contributionError?.message || "Contribucion no encontrada.");
  }

  const contribution = toContribution(contributionRow as Record<string, unknown>);
  const nextStatus: CommunityContributionStatus =
    input.action === "approve" ? "approved" : "rejected";
  const approvedPoints =
    nextStatus === "approved"
      ? normalizeNonNegativeInteger(
          input.pointsAwarded ?? contribution.points_suggested ?? 0
        )
      : 0;

  let balanceAfter = 0;

  if (contribution.app_profile_id != null) {
    const { data: profileRow, error: profileError } = await supabase
      .from("app_profiles")
      .select("credit_balance,reliability_score")
      .eq("id", contribution.app_profile_id)
      .single();

    if (profileError || !profileRow) {
      throw new Error(profileError?.message || "Perfil del colaborador no encontrado.");
    }

    const currentBalance = Number(profileRow.credit_balance ?? 0);
    const currentReliability = Number(profileRow.reliability_score ?? 0);
    const previousApprovedPoints =
      contribution.status === "approved" ? contribution.points_awarded ?? 0 : 0;
    const creditDelta =
      nextStatus === "approved" ? approvedPoints - previousApprovedPoints : -previousApprovedPoints;
    const shouldAdjustReliability =
      contribution.status !== nextStatus &&
      (contribution.status === "pending" || contribution.status === "auto_flagged");
    const reliabilityDelta =
      shouldAdjustReliability
        ? nextStatus === "approved"
          ? APPROVAL_RELIABILITY_DELTA
          : REJECTION_RELIABILITY_DELTA
        : 0;

    balanceAfter = currentBalance + creditDelta;

    const { error: updateProfileError } = await supabase
      .from("app_profiles")
      .update({
        credit_balance: balanceAfter,
        reliability_score: clampReliabilityScore(currentReliability + reliabilityDelta),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.app_profile_id);

    if (updateProfileError) {
      throw new Error(updateProfileError.message);
    }

    if (creditDelta !== 0) {
      const { error: ledgerError } = await supabase.from("credit_ledger").insert({
        amount: creditDelta,
        app_profile_id: contribution.app_profile_id,
        balance_after: balanceAfter,
        contribution_id: contribution.id,
        entry_type:
          creditDelta > 0
            ? contribution.status === "approved"
              ? "adjustment"
              : "reward"
            : "adjustment",
        note:
          nextStatus === "approved"
            ? `Revision de ${contribution.source_type}`
            : `Reversion de recompensa de ${contribution.source_type}`,
      });

      if (ledgerError) {
        throw new Error(ledgerError.message);
      }
    }
  }

  const { data: updatedRow, error: updateContributionError } = await supabase
    .from("community_contributions")
    .update({
      payout_status: nextStatus === "approved" ? "accrued" : "withheld",
      points_awarded: approvedPoints,
      review_notes: normalizeNullableText(input.reviewNotes),
      reviewed_at: new Date().toISOString(),
      reviewer_email: input.reviewerEmail.trim().toLowerCase(),
      status: nextStatus,
    })
    .eq("id", contribution.id)
    .select("*")
    .single();

  if (updateContributionError || !updatedRow) {
    throw new Error(updateContributionError?.message || "No se pudo revisar la contribucion.");
  }

  return toContribution(updatedRow as Record<string, unknown>);
}
