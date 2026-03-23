/**
 * Pure business-rule helpers extracted from inline component logic.
 * Each function is deterministic — no API calls, no side effects.
 */

/**
 * Can the survey be activated (moved from draft → active)?
 * Mirrors the canActivate check in SurveyCreateForm / SurveyEditForm.
 */
export function canActivateSurvey(form) {
  return !!(
    form.client &&
    form.site &&
    form.visit_requirement &&
    form.visit_time &&
    form.working_hours &&
    form.site_requirements &&
    form.arrival_action &&
    form.other_attendees &&
    form.urgent !== undefined && form.urgent !== null && form.urgent !== ""
  );
}

/**
 * Are visit-protocol working-hours complete?
 * Requires at least one day with a truthy entry.
 */
export function isVisitProtocolsComplete(workingHours) {
  if (!workingHours || typeof workingHours !== "object") return false;
  return Object.values(workingHours).some((v) => !!v);
}

/**
 * Is the other_attendees field complete?
 * Must be a non-empty array (["none"] is valid).
 */
export function isOtherAttendeesComplete(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Is the observation a "real" (non-draft, has image) observation?
 */
export function isRealObservation(obs) {
  return !!obs && obs.is_draft === false && !!obs.image;
}

/**
 * Should a new session be auto-started when a photo is taken?
 * Only when the survey is active and the surveyor actually took a photo.
 */
export function shouldStartSession({ surveyStatus, tookPhoto }) {
  const activeStatuses = ["active", "open", "assigned"];
  return activeStatuses.includes(surveyStatus) && tookPhoto === true;
}

/**
 * Can observations be deleted on a survey with this status?
 * Blocked when the survey is completed, cancelled, abandoned, or archived.
 */
export function canDeleteObservation(surveyStatus, recordStatus) {
  const readOnly = ["completed", "cancelled", "abandoned", "archived"];
  if (readOnly.includes(surveyStatus)) return false;
  if (recordStatus === "archived") return false;
  return true;
}

/**
 * Can an entity (site, client, etc.) be deleted?
 * Blocked if it has any real (non-draft) observations.
 */
export function canDeleteEntity(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return true;
  return !observations.some((o) => isRealObservation(o));
}

/**
 * Copy a survey — returns a plain object suitable for POST /api/surveys/.
 * Clears scheduling, assignment, and temporal fields; keeps structural ones.
 */
export function copySurvey(survey) {
  return {
    site: survey.site_id || survey.site,
    visit_requirement: survey.visit_requirement || null,
    visit_time: survey.visit_time || null,
    arrival_action: survey.arrival_action || null,
    departure_action: survey.departure_action || survey.arrival_action || null,
    notes: "",
    urgent: false,
    window_days: survey.window_days || null,
    // Cleared fields (not sent → API defaults to draft, unassigned, no date)
  };
}

/**
 * Copy a site within the same client.
 * Renames with "Copy N" suffix, clears address.
 */
export function copySiteSameClient(site, copyIndex) {
  return {
    client: site.client_id || site.client,
    name: `${site.name} Copy ${copyIndex}`,
    address: "",
    contact_name: site.contact_name || "",
    contact_phone: site.contact_phone || "",
    contact_email: site.contact_email || "",
  };
}

/**
 * Copy a site to a different client.
 * Clears client, address, and contact fields.
 */
export function copySiteDifferentClient(site) {
  return {
    client: null,
    name: site.name,
    address: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  };
}
