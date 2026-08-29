-- THE SAME DISAGREEMENT AS 20260826180000, AND I CAUSED IT AGAIN.
--
-- CI applies every migration to an empty database and then asks Postgres whether the result differs
-- from schema.prisma at all. That check has been failing since the knowledge-cards work, and nobody
-- saw it, because CI has not been able to get a runner on this repository. Building against a
-- database that already had these tables hid it completely: every migration I wrote worked, on the
-- one database where the tables were already there.
--
-- TWO KINDS OF DISAGREEMENT, and only the second is dangerous.
--
-- The first is naming. I wrote short index names by hand; Prisma generates long ones from the
-- columns. Both work and both are on the right columns, so nothing is slow and nothing is missing -
-- but `migrate diff` reports every one, which makes the check that catches the real thing unusable.
--
-- The second is an index that exists in the database and is absent from the schema. Prisma manages
-- what the schema declares, so the next generated migration would DROP those - and the trigram
-- indexes are what make knowledge retrieval and turn recall fast rather than a sequential scan over
-- every card and every turn in the organisation. Losing them silently would look like the product
-- gradually getting slower for no reason anybody could point at.
--
-- So: rename mine to what Prisma expects, and declare the undeclared ones in the schema alongside.

ALTER INDEX "assistant_proposals_organization_id_person_external_id_state_id"
  RENAME TO "assistant_proposals_organization_id_person_external_id_stat_idx";
ALTER INDEX "assistant_turns_organization_id_person_external_id_created_at_i"
  RENAME TO "assistant_turns_organization_id_person_external_id_created__idx";
ALTER INDEX "contributions_org_person_subject_kind_key"
  RENAME TO "contributions_organization_id_person_external_id_subject_ex_key";
ALTER INDEX "departure_records_org_deleted_idx"
  RENAME TO "departure_records_organization_id_turns_deleted_at_idx";
ALTER INDEX "departure_records_org_person_departed_key"
  RENAME TO "departure_records_organization_id_person_external_id_depart_key";
ALTER INDEX "email_preferences_org_person_key"
  RENAME TO "email_preferences_organization_id_person_external_id_key";
ALTER INDEX "onboarding_gates_track_key"
  RENAME TO "onboarding_gates_track_id_key_key";
ALTER INDEX "onboarding_gates_track_ordinal_idx"
  RENAME TO "onboarding_gates_track_id_ordinal_idx";
ALTER INDEX "onboarding_statuses_org_person_idx"
  RENAME TO "onboarding_statuses_organization_id_person_external_id_idx";
ALTER INDEX "onboarding_statuses_person_gate_key"
  RENAME TO "onboarding_statuses_person_external_id_gate_id_key";
ALTER INDEX "onboarding_tracks_org_role_key"
  RENAME TO "onboarding_tracks_organization_id_role_name_key";
ALTER INDEX "role_assignments_org_person_idx"
  RENAME TO "role_assignments_organization_id_person_external_id_idx";
ALTER INDEX "role_assignments_org_role_ended_idx"
  RENAME TO "role_assignments_organization_id_role_name_ended_at_idx";
ALTER INDEX "scenario_candidates_org_proposed_to_idx"
  RENAME TO "scenario_candidates_organization_id_proposed_to_person_exte_idx";
ALTER INDEX "scenario_candidates_org_scenario_subject_idx"
  RENAME TO "scenario_candidates_organization_id_scenario_subject_extern_idx";
ALTER INDEX "scenario_candidates_org_state_expiry_idx"
  RENAME TO "scenario_candidates_organization_id_state_expires_at_idx";
ALTER INDEX "ground_dependencies_escalation_idx"
  RENAME TO "ground_dependencies_status_escalated_at_created_at_idx";

-- The trigram indexes, now declared in the schema too. Prisma names an index after its columns, so
-- the descriptive `_trgm` suffixes have to go - the type is in the schema, which is a better place
-- for it than a name nothing reads.
ALTER INDEX "assistant_turns_content_trgm" RENAME TO "assistant_turns_content_idx";
ALTER INDEX "knowledge_cards_body_trgm"    RENAME TO "knowledge_cards_body_idx";
ALTER INDEX "knowledge_cards_title_trgm"   RENAME TO "knowledge_cards_title_idx";
