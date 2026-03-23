import {
  canActivateSurvey,
  isVisitProtocolsComplete,
  isOtherAttendeesComplete,
  isRealObservation,
  shouldStartSession,
  canDeleteObservation,
  canDeleteEntity,
  copySurvey,
  copySiteSameClient,
  copySiteDifferentClient,
} from "./surveyRules";

// ---------------------------------------------------------------------------
// Survey activation
// ---------------------------------------------------------------------------

describe("canActivateSurvey", () => {
  const completeForm = {
    client: 1,
    site: 2,
    visit_requirement: "prearranged",
    visit_time: "anytime",
    working_hours: { mon: true },
    site_requirements: "none",
    arrival_action: "sign_in",
    other_attendees: ["none"],
    urgent: false,
  };

  test("returns true when all required fields complete", () => {
    expect(canActivateSurvey(completeForm)).toBe(true);
  });

  test("returns false when client missing", () => {
    expect(canActivateSurvey({ ...completeForm, client: null })).toBe(false);
  });

  test("returns false when site missing", () => {
    expect(canActivateSurvey({ ...completeForm, site: "" })).toBe(false);
  });

  test("returns false when visit_requirement missing", () => {
    expect(canActivateSurvey({ ...completeForm, visit_requirement: "" })).toBe(false);
  });

  test("returns false when working_hours missing", () => {
    expect(canActivateSurvey({ ...completeForm, working_hours: null })).toBe(false);
  });

  test("returns false when arrival_action missing", () => {
    expect(canActivateSurvey({ ...completeForm, arrival_action: "" })).toBe(false);
  });

  test("returns false when other_attendees missing", () => {
    expect(canActivateSurvey({ ...completeForm, other_attendees: null })).toBe(false);
  });

  test("returns false when urgent is empty string", () => {
    expect(canActivateSurvey({ ...completeForm, urgent: "" })).toBe(false);
  });

  test("returns true when urgent is false (explicitly set)", () => {
    expect(canActivateSurvey({ ...completeForm, urgent: false })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Other attendees
// ---------------------------------------------------------------------------

describe("isOtherAttendeesComplete", () => {
  test('["none"] is valid', () => {
    expect(isOtherAttendeesComplete(["none"])).toBe(true);
  });

  test("empty array is not valid", () => {
    expect(isOtherAttendeesComplete([])).toBe(false);
  });

  test("null is not valid", () => {
    expect(isOtherAttendeesComplete(null)).toBe(false);
  });

  test("multiple attendees is valid", () => {
    expect(isOtherAttendeesComplete(["client", "contractor"])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Visit protocols (working hours)
// ---------------------------------------------------------------------------

describe("isVisitProtocolsComplete", () => {
  test("requires at least one working hours entry", () => {
    expect(isVisitProtocolsComplete({ mon: { start: "09:00", end: "17:00" } })).toBe(true);
  });

  test("empty object is not complete", () => {
    expect(isVisitProtocolsComplete({})).toBe(false);
  });

  test("null is not complete", () => {
    expect(isVisitProtocolsComplete(null)).toBe(false);
  });

  test("all-falsy entries is not complete", () => {
    expect(isVisitProtocolsComplete({ mon: false, tue: false })).toBe(false);
  });

  test("boolean true entry is complete", () => {
    expect(isVisitProtocolsComplete({ wed: true })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Session start logic
// ---------------------------------------------------------------------------

describe("shouldStartSession", () => {
  test("starts when survey is active and photo taken", () => {
    expect(shouldStartSession({ surveyStatus: "active", tookPhoto: true })).toBe(true);
  });

  test("starts when survey is open and photo taken", () => {
    expect(shouldStartSession({ surveyStatus: "open", tookPhoto: true })).toBe(true);
  });

  test("starts when survey is assigned and photo taken", () => {
    expect(shouldStartSession({ surveyStatus: "assigned", tookPhoto: true })).toBe(true);
  });

  test("does not start without photo", () => {
    expect(shouldStartSession({ surveyStatus: "active", tookPhoto: false })).toBe(false);
  });

  test("does not start on draft survey", () => {
    expect(shouldStartSession({ surveyStatus: "draft", tookPhoto: true })).toBe(false);
  });

  test("does not start on completed survey", () => {
    expect(shouldStartSession({ surveyStatus: "completed", tookPhoto: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real observation detection
// ---------------------------------------------------------------------------

describe("isRealObservation", () => {
  test("is_draft=false and image present → true", () => {
    expect(isRealObservation({ is_draft: false, image: "https://example.com/img.jpg" })).toBe(true);
  });

  test("draft observation → false", () => {
    expect(isRealObservation({ is_draft: true, image: "https://example.com/img.jpg" })).toBe(false);
  });

  test("non-draft but no image → false", () => {
    expect(isRealObservation({ is_draft: false, image: null })).toBe(false);
  });

  test("null observation → false", () => {
    expect(isRealObservation(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Delete restrictions
// ---------------------------------------------------------------------------

describe("canDeleteObservation", () => {
  test("cannot delete in completed survey", () => {
    expect(canDeleteObservation("completed")).toBe(false);
  });

  test("cannot delete in cancelled survey", () => {
    expect(canDeleteObservation("cancelled")).toBe(false);
  });

  test("cannot delete in abandoned survey", () => {
    expect(canDeleteObservation("abandoned")).toBe(false);
  });

  test("cannot delete in archived survey", () => {
    expect(canDeleteObservation("archived")).toBe(false);
  });

  test("cannot delete when record status is archived", () => {
    expect(canDeleteObservation("active", "archived")).toBe(false);
  });

  test("can delete in active survey", () => {
    expect(canDeleteObservation("active")).toBe(true);
  });

  test("can delete in draft survey", () => {
    expect(canDeleteObservation("draft")).toBe(true);
  });
});

describe("canDeleteEntity", () => {
  test("cannot delete entity if real observations exist", () => {
    const obs = [{ is_draft: false, image: "https://example.com/img.jpg" }];
    expect(canDeleteEntity(obs)).toBe(false);
  });

  test("can delete entity if only draft observations exist", () => {
    const obs = [{ is_draft: true, image: "https://example.com/img.jpg" }];
    expect(canDeleteEntity(obs)).toBe(true);
  });

  test("can delete entity with no observations", () => {
    expect(canDeleteEntity([])).toBe(true);
  });

  test("can delete entity with null observations", () => {
    expect(canDeleteEntity(null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Survey copy
// ---------------------------------------------------------------------------

describe("copySurvey", () => {
  const source = {
    site_id: 5,
    site: 5,
    visit_requirement: "prearranged",
    visit_time: "window",
    arrival_action: "sign_in",
    departure_action: "sign_out",
    notes: "Some notes",
    urgent: true,
    window_days: { mon: { start: "09:00", end: "17:00" } },
    scheduled_for: "2026-04-01",
    assigned_to: 12,
    attendees: ["client"],
    deadline: "2026-05-01",
    status: "active",
  };

  test("clears notes", () => {
    expect(copySurvey(source).notes).toBe("");
  });

  test("sets urgent to false", () => {
    expect(copySurvey(source).urgent).toBe(false);
  });

  test("does not include assigned_to", () => {
    expect(copySurvey(source)).not.toHaveProperty("assigned_to");
  });

  test("does not include scheduled_for (survey_date)", () => {
    expect(copySurvey(source)).not.toHaveProperty("scheduled_for");
  });

  test("does not include attendees", () => {
    expect(copySurvey(source)).not.toHaveProperty("attendees");
  });

  test("does not include deadline", () => {
    expect(copySurvey(source)).not.toHaveProperty("deadline");
  });

  test("does not include status (API defaults to draft)", () => {
    expect(copySurvey(source)).not.toHaveProperty("status");
  });

  test("preserves site", () => {
    expect(copySurvey(source).site).toBe(5);
  });

  test("preserves visit_requirement", () => {
    expect(copySurvey(source).visit_requirement).toBe("prearranged");
  });

  test("preserves window_days", () => {
    expect(copySurvey(source).window_days).toEqual({ mon: { start: "09:00", end: "17:00" } });
  });

  test("falls back departure_action to arrival_action when missing", () => {
    const noDepart = { ...source, departure_action: null };
    expect(copySurvey(noDepart).departure_action).toBe("sign_in");
  });
});

// ---------------------------------------------------------------------------
// Site copy — same client
// ---------------------------------------------------------------------------

describe("copySiteSameClient", () => {
  const site = {
    client_id: 3,
    client: 3,
    name: "Main Office",
    address: "123 High Street",
    contact_name: "Jane",
    contact_phone: "07700900000",
    contact_email: "jane@example.com",
  };

  test("renames with Copy N suffix", () => {
    expect(copySiteSameClient(site, 1).name).toBe("Main Office Copy 1");
    expect(copySiteSameClient(site, 2).name).toBe("Main Office Copy 2");
  });

  test("clears address", () => {
    expect(copySiteSameClient(site, 1).address).toBe("");
  });

  test("keeps client", () => {
    expect(copySiteSameClient(site, 1).client).toBe(3);
  });

  test("keeps contact fields", () => {
    const copy = copySiteSameClient(site, 1);
    expect(copy.contact_name).toBe("Jane");
    expect(copy.contact_phone).toBe("07700900000");
    expect(copy.contact_email).toBe("jane@example.com");
  });
});

// ---------------------------------------------------------------------------
// Site copy — different client
// ---------------------------------------------------------------------------

describe("copySiteDifferentClient", () => {
  const site = {
    client_id: 3,
    client: 3,
    name: "Main Office",
    address: "123 High Street",
    contact_name: "Jane",
    contact_phone: "07700900000",
    contact_email: "jane@example.com",
  };

  test("clears client", () => {
    expect(copySiteDifferentClient(site).client).toBeNull();
  });

  test("clears address", () => {
    expect(copySiteDifferentClient(site).address).toBe("");
  });

  test("clears contact fields", () => {
    const copy = copySiteDifferentClient(site);
    expect(copy.contact_name).toBe("");
    expect(copy.contact_phone).toBe("");
    expect(copy.contact_email).toBe("");
  });

  test("keeps site name", () => {
    expect(copySiteDifferentClient(site).name).toBe("Main Office");
  });
});
