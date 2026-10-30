// Built-in help for the "Need help?" assistant. Every answer describes the
// real screens and buttons in ubuntumed — keep it in sync when a flow
// changes. Matching is local keyword search (see searchHelp): nothing a
// user types leaves the browser.
import type { Role } from "@/lib/auth/types";

export interface HelpTopic {
  id: string;
  question: string;
  /** Who this applies to; omitted = everyone. */
  roles?: Role[];
  /** Extra words people might use for this topic (synonyms, local terms). */
  keywords: string[];
  steps: string[];
  /** Page the "Go there" button opens. */
  link?: { href: string; label: string };
  /** Pages where this topic is suggested first. */
  pages?: string[];
}

const CLINICAL: Role[] = ["nurse", "gynecologist"];

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "register-patient",
    question: "How do I register a new patient?",
    roles: ["nurse"],
    keywords: ["register", "new patient", "add patient", "new mother", "add mother", "pregnant woman", "create patient", "antenatal care", "enroll", "enrol"],
    steps: [
      "Open Patient Registry from the menu.",
      "Click “+ Add Antenatal Care” at the top right.",
      "Fill in the patient's details (name, national ID, date of birth, phone, residence, emergency contact) and save.",
      "You're taken straight to the new patient's page, where you can start her first assessment.",
    ],
    link: { href: "/dashboard/nurse/patients", label: "Open Patient Registry" },
    pages: ["/dashboard/nurse/patients"],
  },
  {
    id: "find-patient",
    question: "How do I find a patient?",
    roles: ["nurse", "gynecologist", "hospital_admin"],
    keywords: ["find", "search", "look up", "lookup", "national id", "phone number", "where is patient", "filter"],
    steps: [
      "Use the search box at the top of every page and type the patient's national ID or phone number.",
      "Or open Patient Registry and search by phone number or ID, filter by risk level, or sort by last update, name or highest risk.",
      "Click a patient to open her full record.",
    ],
    link: { href: "/dashboard/nurse/patients", label: "Open Patient Registry" },
    pages: ["/dashboard/nurse/patients"],
  },
  {
    id: "new-assessment",
    question: "How do I record a visit (new assessment)?",
    roles: CLINICAL,
    keywords: ["visit", "assessment", "record visit", "anc visit", "checkup", "check-up", "vitals", "vital signs", "blood pressure", "consultation"],
    steps: [
      "Open the patient's page and choose the “New Assessment” tab.",
      "Work through the steps: Vital signs, Symptoms, Labs, Consultation, AI review, Final diagnosis, Treatment, Consumables, Vaccination and Summary.",
      "If you request lab tests in the Labs step, the patient waits on “awaiting labs” until the lab sends results — then finish the assessment.",
      "Finalize on the Summary step. The visit appears under the “Visit” tab and updates her risk colour.",
    ],
    pages: ["/dashboard/nurse/patients"],
  },
  {
    id: "request-labs",
    question: "How do I request lab tests?",
    roles: CLINICAL,
    keywords: ["lab", "laboratory", "test", "request lab", "blood test", "urine", "hemoglobin", "hb", "sample", "investigation"],
    steps: [
      "Start a New Assessment on the patient's page.",
      "In the Labs step, pick the tests you need (blood, urine, screening & imaging, other).",
      "The request goes to your facility's laboratory nurses. You'll be alerted when results are back — critical results are flagged.",
    ],
  },
  {
    id: "create-referral",
    question: "How do I refer a patient to another facility?",
    roles: CLINICAL,
    keywords: ["refer", "referral", "transfer", "send patient", "another hospital", "another facility", "emergency referral"],
    steps: [
      "Open the patient's page.",
      "Click “Actions” at the top right, then “Create referral”.",
      "Choose the receiving facility, the urgency (routine, urgent or emergency) and write the reason.",
      "Emergency referrals are shown to every facility able to manage them; the first to accept takes the patient. Track them in Referral Log.",
    ],
    link: { href: "/dashboard/nurse/referrals", label: "Open Referral Log" },
    pages: ["/dashboard/nurse/referrals"],
  },
  {
    id: "accept-emergency",
    question: "How do I accept a pending emergency referral?",
    roles: CLINICAL,
    keywords: ["accept", "emergency", "pending", "red case", "obstetric emergency", "take patient", "waiting"],
    steps: [
      "Pending emergencies appear in the red “Pending Emergency Referrals” panel at the top of every page (only at facilities able to manage them).",
      "They're ranked: #1 has waited longest. The badge shows how long each has waited, and turns red after 1 hour.",
      "Click a case to see the patient's emergency information, or click “Accept” to take responsibility for her.",
      "If your facility's emergency capacity is full, new emergencies are not shown to you.",
    ],
  },
  {
    id: "hide-emergency-panel",
    question: "How do I hide the emergency referrals panel?",
    keywords: ["hide", "collapse", "panel", "red box", "emergency panel", "too big", "cover"],
    steps: [
      "Click “Hide” next to “Visible to all capable facilities” in the panel.",
      "The panel shrinks to its title and the number of cases, so you can use the rest of the page.",
      "Click “Show” to see the cases again.",
    ],
  },
  {
    id: "risk-colours",
    question: "What do the risk colours mean?",
    keywords: ["risk", "colour", "color", "red", "orange", "yellow", "green", "classification", "high risk", "danger"],
    steps: [
      "Red — obstetric emergency: needs immediate referral and acceptance by a receiving facility.",
      "Orange — urgent: close monitoring and prompt clinical attention.",
      "Yellow — close follow-up: more frequent antenatal follow-up than routine.",
      "Green — routine: no elevated risk factors; continue the routine schedule.",
      "Risk Classification lists every patient by level, with the signs that trigger each colour.",
    ],
    link: { href: "/dashboard/nurse/risk-classification", label: "Open Risk Classification" },
    pages: ["/dashboard/nurse/risk-classification"],
  },
  {
    id: "acknowledge-alert",
    question: "How do I acknowledge an alert (for example a missed visit)?",
    roles: ["nurse"],
    keywords: ["alert", "acknowledge", "missed visit", "missed", "absent", "did not come", "didn't come", "no show", "not come", "notification", "warning", "dismiss"],
    steps: [
      "Open Active Alerts from the menu.",
      "Find the alert and click “Acknowledge”.",
      "Add a note about what you did (for example, you called the mother), then confirm.",
      "Use the filter to see unacknowledged or acknowledged alerts.",
    ],
    link: { href: "/dashboard/nurse/alerts", label: "Open Active Alerts" },
    pages: ["/dashboard/nurse/alerts"],
  },
  {
    id: "assign-chw",
    question: "How do I assign a community health worker?",
    roles: CLINICAL,
    keywords: ["chw", "community health worker", "assign", "home visit", "community", "follow up at home"],
    steps: [
      "Open the patient's page.",
      "Click “Actions”, then “Assign Community Health Worker”.",
      "ubuntumed finds the CHW who covers her isibo (or village) from her address — check the match and confirm.",
      "The CHW's home-visit reports appear in the patient's “CHW Reports” tab.",
    ],
  },
  {
    id: "close-pregnancy",
    question: "How do I close a pregnancy after delivery?",
    roles: CLINICAL,
    keywords: ["close pregnancy", "delivery", "birth", "delivered", "outcome", "baby", "stillbirth", "end pregnancy"],
    steps: [
      "Open the patient's page and go to the “Pregnancy” tab.",
      "Click “Close Pregnancy”.",
      "Enter the delivery outcome, date, method, baby status, birth weight, number of babies and the mother's condition.",
      "Birth weight is optional when the baby is deceased.",
    ],
  },
  {
    id: "update-patient",
    question: "How do I update a patient's details?",
    roles: ["nurse"],
    keywords: ["edit patient", "update patient", "change patient", "correct", "phone", "address", "details", "mistake"],
    steps: [
      "Open the patient's page.",
      "Click “Update details” at the top right.",
      "Correct the information and click “Save changes”.",
    ],
  },
  {
    id: "todays-visits",
    question: "Where do I see today's expected visits?",
    roles: CLINICAL,
    keywords: ["today", "expected", "due", "schedule", "appointments", "who is coming", "worklist", "this week"],
    steps: [
      "On the Dashboard, “Today's ANC Visits” lists mothers due today and visits already recorded.",
      "Use its dropdown to switch to this week, month or year.",
      "“Not yet arrived” means she's due but no visit is recorded yet. Click a patient to open her record.",
    ],
    link: { href: "/dashboard", label: "Open Dashboard" },
    pages: ["/dashboard", "/dashboard/nurse", "/dashboard/gynecologist"],
  },
  {
    id: "specialist-notes",
    question: "How do specialist notes work?",
    roles: CLINICAL,
    keywords: ["specialist", "gynecologist", "recommendation", "notes", "doctor advice", "acknowledge recommendation"],
    steps: [
      "Gynecologists leave recommendations in the patient's “Specialist Notes” tab.",
      "The responsible nurse reads them there and clicks “Acknowledge” to confirm.",
    ],
  },
  {
    id: "pharmacy",
    question: "How do I add a medicine or restock the pharmacy?",
    roles: ["pharmacist", "hospital_admin"],
    keywords: ["pharmacy", "inventory", "stock", "medicine", "drug", "restock", "add item", "consumable", "cart"],
    steps: [
      "Open Pharmacy Inventory from the menu.",
      "To add a new item, fill in the form at the top (name, drug or consumable, unit, quantity, reorder level, unit price) and click “Add Item”.",
      "To change stock on an existing item, type a quantity on its row and click “+ Restock” or “− Remove”.",
      "Badges show In Stock, Low Stock (at or below the reorder level) or Out of Stock.",
    ],
    link: { href: "/dashboard/nurse/inventory", label: "Open Pharmacy Inventory" },
    pages: ["/dashboard/nurse/inventory"],
  },
  {
    id: "process-lab-request",
    question: "How do I process a lab request and send results?",
    roles: ["lab_nurse"],
    keywords: ["lab request", "results", "accept request", "submit results", "process", "urinalysis", "urine analysis", "enter results"],
    steps: [
      "Open Lab Requests and click a pending request.",
      "Click “Accept Request & Begin Tests” — this locks it to you.",
      "Enter each result. Many tests have a list of answers; panels like Urine Analysis have one dropdown per reading. Pick “Other…” to type a result that isn't listed.",
      "Check the interpretation (it's suggested as Abnormal when a value is out of range) and mark Critical where needed.",
      "Add a note for the requesting nurse if useful, then click “Submit Laboratory Results”. Critical results alert the nurse.",
    ],
    link: { href: "/dashboard/lab/requests", label: "Open Lab Requests" },
    pages: ["/dashboard/lab/requests", "/dashboard/lab"],
  },
  {
    id: "lab-history",
    question: "Where do I find past lab results?",
    roles: ["lab_nurse"],
    keywords: ["history", "past results", "completed", "previous", "old requests"],
    steps: ["Open Lab History from the menu to see completed requests and their results for your facility."],
    link: { href: "/dashboard/lab/history", label: "Open Lab History" },
  },
  {
    id: "dispense-drug-request",
    question: "How do I dispense drugs to a patient?",
    roles: ["pharmacist"],
    keywords: ["dispense", "drug request", "prescription", "pharmacy", "medicine", "give drugs"],
    steps: [
      "When the patient reaches the counter, open Drug Requests and search by their ID or phone.",
      "Open the request and click “Accept Request & Prepare Drugs” — this locks it to you.",
      "Check the quantity to give for each drug. It is capped at what is in stock; give less if stock is short.",
      "Add a note for the nurse if anything was given short, then click “Confirm & Dispense”. Stock goes down automatically.",
    ],
    link: { href: "/dashboard/pharmacy/requests", label: "Open Drug Requests" },
    pages: ["/dashboard/pharmacy/requests", "/dashboard/pharmacy"],
  },
  {
    id: "capacity-limit",
    question: "How do I set my facility's emergency capacity?",
    roles: ["hospital_admin"],
    keywords: ["capacity", "limit", "full", "beds", "emergency capacity", "facility"],
    steps: [
      "Open Settings and choose the “Facility” tab (or use “Edit limit” on the Dashboard).",
      "Enter how many active emergency cases your facility can take at once and save.",
      "When the limit is reached your facility shows as Full and stops receiving new emergency referrals.",
    ],
    link: { href: "/dashboard/settings", label: "Open Settings" },
  },
  {
    id: "staff",
    question: "How do I manage staff accounts?",
    roles: ["hospital_admin"],
    keywords: ["staff", "users", "accounts", "add nurse", "suspend", "employee", "reset staff password"],
    steps: ["Open Staff Management from the menu to register staff, suspend or reactivate accounts, and reset passwords."],
    link: { href: "/dashboard/hospital-admin/staff", label: "Open Staff Management" },
  },
  {
    id: "reports",
    question: "Where are the facility reports?",
    roles: ["hospital_admin"],
    keywords: ["report", "statistics", "maternal care report", "referral report", "laboratory report", "export", "numbers"],
    steps: ["Open Reports from the menu for maternal care, referral and laboratory reports for your facility."],
    link: { href: "/dashboard/hospital-admin/reports", label: "Open Reports" },
  },
  {
    id: "change-password",
    question: "How do I change my password?",
    keywords: ["password", "change password", "new password", "security", "pin"],
    steps: [
      "Open Settings and choose the “Security” tab.",
      "Enter your current password, then the new one twice (at least 8 characters), and click “Change password”.",
      "You'll be signed out on every device and asked to sign in with the new password.",
    ],
    link: { href: "/dashboard/settings", label: "Open Settings" },
    pages: ["/dashboard/settings"],
  },
  {
    id: "forgot-password",
    question: "I forgot my password — what do I do?",
    keywords: ["forgot", "forgotten", "reset password", "cant sign in", "can't log in", "locked out", "login problem"],
    steps: [
      "On the sign-in page, click “Forgot password?”.",
      "Enter your email; you'll receive a link to set a new password.",
      "If you don't get the email, ask your facility administrator to reset it for you.",
    ],
  },
  {
    id: "profile-photo",
    question: "How do I add a profile photo or my phone number?",
    keywords: ["photo", "picture", "profile", "avatar", "image", "phone number", "contact", "my details"],
    steps: [
      "Open Settings → Profile and click “Update details”.",
      "Choose a photo (JPEG, PNG or WebP — it's cropped to a square) and/or enter your phone number.",
      "Click “Save changes”. Your photo then shows at the top of every page.",
    ],
    link: { href: "/dashboard/settings", label: "Open Settings" },
    pages: ["/dashboard/settings"],
  },
  {
    id: "auto-sign-out",
    question: "How do I sign out automatically on a shared computer?",
    keywords: ["sign out", "log out", "logout", "auto sign out", "shared computer", "timeout", "inactivity", "everywhere"],
    steps: [
      "Open Settings → Security. Under Sessions, set “Auto sign-out” to 15, 30 or 60 minutes.",
      "After that long without activity, this device signs you out.",
      "“Sign out everywhere” ends your sessions on all devices at once.",
    ],
    link: { href: "/dashboard/settings", label: "Open Settings" },
  },
  {
    id: "preferences",
    question: "Can I change how pages open by default?",
    keywords: ["default", "preferences", "date range", "card view", "list view", "layout", "settings"],
    steps: [
      "Open Settings → Preferences.",
      "Choose the date range the Dashboard opens with, and whether the Patient Registry opens as a list or as cards.",
      "These apply on this device only.",
    ],
    link: { href: "/dashboard/settings", label: "Open Settings" },
  },
];

const STOPWORDS = new Set(
  "a an the i me my we our you your to do does did how can could where what when which who is are am be of for in on at with and or it this that from".split(" "),
);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

// Crude stemming so "registering", "registered" and "register" match.
function stem(word: string): string {
  return word.replace(/(ing|ed|es|s)$/, "");
}

export function topicsForRole(role: Role): HelpTopic[] {
  return HELP_TOPICS.filter((t) => !t.roles || t.roles.includes(role));
}

function topicStems(topic: HelpTopic): Set<string> {
  return new Set(words(`${topic.question} ${topic.keywords.join(" ")}`).map(stem));
}

const STEMS_BY_TOPIC = new Map(HELP_TOPICS.map((t) => [t.id, topicStems(t)]));

// How many topics mention each word — words that appear in many topics
// ("patient", "visit") say little about which one is meant.
const TOPIC_COUNT_BY_STEM = new Map<string, number>();
for (const stems of STEMS_BY_TOPIC.values()) {
  for (const s of stems) TOPIC_COUNT_BY_STEM.set(s, (TOPIC_COUNT_BY_STEM.get(s) ?? 0) + 1);
}

/** Topics ranked by how well they match the question; empty when nothing matches. */
export function searchHelp(query: string, role: Role): HelpTopic[] {
  const queryLower = query.toLowerCase();
  const queryStems = words(query).map(stem);
  if (queryStems.length === 0) return [];

  return topicsForRole(role)
    .map((topic) => {
      let score = 0;
      // Whole keyword phrases found in the question weigh most.
      for (const keyword of topic.keywords) {
        if (queryLower.includes(keyword)) score += 2 * keyword.split(" ").length;
      }
      // Single words count more the rarer they are across topics.
      const stems = STEMS_BY_TOPIC.get(topic.id)!;
      for (const s of queryStems) if (stems.has(s)) score += 2 / (TOPIC_COUNT_BY_STEM.get(s) ?? 1);
      return { topic, score };
    })
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.topic);
}

/** Starter questions: this page's topics first, then the most common for the role. */
export function suggestedTopics(role: Role, pathname: string, count = 4): HelpTopic[] {
  const available = topicsForRole(role);
  const forPage = available.filter((t) => t.pages?.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
  const rest = available.filter((t) => !forPage.includes(t));
  return [...forPage, ...rest].slice(0, count);
}
