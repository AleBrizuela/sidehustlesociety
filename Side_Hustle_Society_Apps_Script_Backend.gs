/**
 * SIDE HUSTLE SOCIETY: Apps Script backend
 *
 * This script receives submissions from the landing page widget,
 * appends them to the shared Google Sheet, and emails the right
 * leader so they can act fast.
 *
 * Routing:
 *   Client requests (people needing help)  ->  Erez Waisman
 *   Student signups  (people wanting gigs) ->  Caetano Sanchez
 *
 * ============================================================
 * SETUP (15 minutes)
 * ============================================================
 * 1. Open your shared Google Sheet (the one with "Job Requests"
 *    and "Members" tabs).
 * 2. Extensions menu > Apps Script.
 * 3. Delete any default code. Paste THIS file's contents.
 * 4. Update CONFIG below if anything needs to change.
 * 5. Click Deploy > New deployment.
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Click Deploy, then copy the Web App URL.
 * 6. Paste the Web App URL into the BACKEND_URL constant at the
 *    bottom of Side_Hustle_Society_Landing_Page.html.
 * 7. Redeploy the HTML page (GitHub Pages, Netlify, etc).
 * 8. Test: submit a fake request from the widget. A new row
 *    should appear in the sheet and an email should land in the
 *    assigned leader's inbox within seconds.
 */

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  CLIENT_EMAIL:  "erezwaisman23@gmail.com",   // Gets: client (help) requests
  STUDENT_EMAIL: "caenanosanchez@gmail.com",  // Gets: student (gig) signups

  // Names of the sheet tabs in your Master Sheet
  CLIENT_TAB:   "Job Requests",
  STUDENT_TAB:  "Members",

  // Reply-to email (club gmail, shows up as the sender)
  REPLY_TO:     "sidehustlesociety@cchs.example",
};

// ============================================================
// HTTP ENTRY POINT
// ============================================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (payload._type === "client_request") {
      handleClientRequest(payload);
    } else if (payload._type === "student_signup") {
      handleStudentSignup(payload);
    } else {
      throw new Error("Unknown submission type: " + payload._type);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // For health checks / quick browser test
  return ContentService
    .createTextOutput("Side Hustle Society backend is alive.")
    .setMimeType(ContentService.MimeType.TEXT);
}

// Compose the structured availability into a readable single-line string
function composeAvailability(d) {
  const times = Array.isArray(d.times) ? d.times.join(", ") : "";
  const days  = Array.isArray(d.days)  ? d.days.join(", ")  : "";
  const notes = d.availability_notes || "";
  const parts = [];
  if (times) parts.push(times);
  if (days)  parts.push("on " + days);
  if (notes) parts.push("(" + notes + ")");
  return parts.join(" ");
}

// ============================================================
// CLIENT REQUEST (resident needs help) -> Erez
// ============================================================
function handleClientRequest(d) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.CLIENT_TAB);
  if (!sheet) throw new Error("Sheet tab not found: " + CONFIG.CLIENT_TAB);

  const services = Array.isArray(d.services) ? d.services.join(", ") : (d.services || "");

  const row = [
    d._submitted_at || new Date().toISOString(),
    d.name || "",
    d.phone || "",
    d.email || "",
    d.neighborhood || "",
    services,
    d.description || "",
    d.preferred_date || "",
    d.duration || "",
    d.pets_kids || "",
    d.notes || "",
    "NEW",  // triage status
    "",     // assigned to, filled in later
  ];
  sheet.appendRow(row);

  // Email Erez
  const subject = "NEW GIG REQUEST from " + (d.name || "unknown");
  const body =
    "A new client request just came in. Please phone-screen within 24 hours.\n\n" +
    "Name:          " + (d.name || "") + "\n" +
    "Phone:         " + (d.phone || "") + "\n" +
    "Email:         " + (d.email || "") + "\n" +
    "Neighborhood:  " + (d.neighborhood || "") + "\n" +
    "Services:      " + services + "\n" +
    "Preferred:     " + (d.preferred_date || "") + "\n" +
    "Duration:      " + (d.duration || "") + "\n" +
    "Pets/kids:     " + (d.pets_kids || "") + "\n\n" +
    "Description:\n" + (d.description || "") + "\n\n" +
    (d.notes ? "Notes:\n" + d.notes + "\n\n" : "") +
    "Master sheet: " + SpreadsheetApp.getActive().getUrl() + "\n\n" +
    "Go, team.";

  MailApp.sendEmail({
    to:      CONFIG.CLIENT_EMAIL,
    subject: subject,
    body:    body,
    replyTo: CONFIG.REPLY_TO,
    name:    "Side Hustle Society",
  });
}

// ============================================================
// STUDENT SIGNUP (wants a gig) -> Caetano
// ============================================================
function handleStudentSignup(d) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.STUDENT_TAB);
  if (!sheet) throw new Error("Sheet tab not found: " + CONFIG.STUDENT_TAB);

  const services = Array.isArray(d.services) ? d.services.join(", ") : (d.services || "");
  const availability = composeAvailability(d);

  const row = [
    d._submitted_at || new Date().toISOString(),
    d.name || "",
    d.grade || "",
    "",                         // Signup date (filled in manually)
    "",                         // Consent received date
    d.phone || "",
    d.email || "",
    d.neighborhood || "",
    services,
    availability,
    d.parent_name || "",
    d.parent_phone || "",
    d.emergency || "",
    d.cpr || "",
    d.consent ? "acknowledged" : "not acknowledged",
  ];
  sheet.appendRow(row);

  // Email Caetano
  const subject = "NEW STUDENT SIGNUP: " + (d.name || "unknown") +
                  " (Grade " + (d.grade || "?") + ")";
  const body =
    "A new CCHS student just signed up. Have Olivia onboard them.\n\n" +
    "Name:          " + (d.name || "") + "\n" +
    "Grade 26-27:   " + (d.grade || "") + "\n" +
    "Phone:         " + (d.phone || "") + "\n" +
    "Email:         " + (d.email || "") + "\n" +
    "Neighborhood:  " + (d.neighborhood || "") + "\n" +
    "Services:      " + services + "\n" +
    "Availability:  " + availability + "\n" +
    "CPR:           " + (d.cpr || "") + "\n\n" +
    "Parent:        " + (d.parent_name || "") + "\n" +
    "Parent phone:  " + (d.parent_phone || "") + "\n" +
    "Emergency:     " + (d.emergency || "") + "\n" +
    "Consent:       " + (d.consent ? "acknowledged" : "NOT acknowledged") + "\n\n" +
    "Reminder: collect signed paper consent before their first job.\n\n" +
    "Master sheet: " + SpreadsheetApp.getActive().getUrl() + "\n\n" +
    "Go, team.";

  MailApp.sendEmail({
    to:      CONFIG.STUDENT_EMAIL,
    subject: subject,
    body:    body,
    replyTo: CONFIG.REPLY_TO,
    name:    "Side Hustle Society",
  });
}
