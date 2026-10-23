'use client'
import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import KycPhoto from "@/components/KycPhoto";
import { approveKYCRequest, rejectKYCRequest, releaseKYCClaim, revokeKYC } from "@/utils/kyc";

const MAX_REASON_LENGTH = 300;
// Mirrors KYC_CHECK_STALE_MS in the web app (lib/kycAccess.js): a "running"
// automatic check older than this was abandoned.
const KYC_CHECK_STALE_MS = 90 * 1000;

const DOCUMENT_LABELS = {
  student_id: "Student ID card",
  portal_screenshot: "Portal screenshot",
  library_card: "Library card",
};

const toMillis = (v) => (v?.toMillis ? v.toMillis() : typeof v?.seconds === "number" ? v.seconds * 1000 : v ? Date.parse(v) : null);
const formatDate = (ms) => (ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const yesNo = (value) => (value === true ? "yes" : value === false ? "no" : "unknown");

export function describeRejection(reason) {
  if (reason === "matric_already_used") return "This matric number is already linked to another verified account.";
  if (reason === "not_eligible") return "Not eligible for the fresher route (300 level or above, or not an LCU account).";
  return reason || "No reason recorded.";
}

// One line on the automatic check of an ID-card request.
function describeIdCheck(check) {
  if (!check) return "No automatic check recorded for this request.";
  if (check.state === "running") {
    return Date.now() - (check.startedAtMs || 0) < KYC_CHECK_STALE_MS ? "Automatic check in progress…" : "Automatic check didn't finish.";
  }
  if (check.state === "error") return `Automatic check couldn't run${check.message ? ` (${check.message})` : ""}.`;
  const verdict = check.state === "passed" ? "Passed" : "Couldn't confirm";
  const parts = [
    `name ${check.nameMatched ?? "?"}/${check.nameWords ?? "?"} words`,
    check.matricFound ? "matric found" : "matric not found",
    check.institutionFound ? "school found" : "school not found",
  ];
  if (check.upgradeNameMismatch) parts.push("name doesn't match their provisional record");
  return `${verdict}: ${parts.join(" · ")}`;
}

// The student's account-level KYC (the request's status alone doesn't say it:
// e.g. a provisional student's upgrade request can be pending).
function describeLevel(user) {
  if (!user) return "—";
  if (user.isVerified === true) return "Fully verified";
  if (user.kycLevel === "provisional") {
    const expires = toMillis(user.provisionalExpiresAt);
    return expires && expires > Date.now() ? `Provisional until ${formatDate(expires)}` : `Provisional — ended ${formatDate(expires)}`;
  }
  if (user.kycRevokedAt) return `Not verified (revoked ${formatDate(toMillis(user.kycRevokedAt))})`;
  return "Not verified";
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  );
}

/**
 * The admin's review of one KYC request: ID cards (full verification) and
 * fresher documents (provisional), with everything the automatic check found,
 * and every decision an admin can make — approve, reject, revoke, and the way
 * out of a number clash (release the claim, or approve and take it over).
 */
export default function KycReviewModal({ request, onClose, onDecided }) {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [reason, setReason] = useState("");
  const [overrideEligibility, setOverrideEligibility] = useState(false);
  const [takeOverClaim, setTakeOverClaim] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const isFresher = request.track === "fresher_document";
  const documentType = request.documentType || "student_id";
  const notEligible = request.eligibility?.eligible === false || request.rejectionReason === "not_eligible";
  const clash = request.claimConflict || error?.data?.conflict || null;
  const userCleared = user?.isVerified === true || !!user?.kycLevel;
  // Recorded at submission; requests from before that show the profile as it is now.
  const accountName = request.account ? request.account.fullName : user?.fullName;
  const accountEmail = request.account ? request.account.email : user?.email;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [userSnap, historySnap] = await Promise.all([
          getDoc(doc(db, "users", request.id)),
          getDocs(query(collection(db, "kycRequests", request.id, "history"), orderBy("archivedAt", "desc"), limit(10))),
        ]);
        if (cancelled) return;
        setUser(userSnap.exists() ? userSnap.data() : null);
        setHistory(historySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (loadError) {
        console.error("Error loading the student's KYC context:", loadError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request.id]);

  const run = async (action, needsReason, success) => {
    const trimmed = reason.trim();
    if (needsReason && trimmed.length < 3) {
      setError({ message: "Add a reason — it's recorded, and emailed to the student for rejections and revocations." });
      return;
    }
    setError(null);
    setProcessing(true);
    try {
      const result = await action(trimmed);
      onDecided([success, result?.creditNote].filter(Boolean).join("\n\n"));
    } catch (actionError) {
      setError({ message: actionError.message, data: actionError.data });
    } finally {
      setProcessing(false);
    }
  };

  const approve = () => {
    if (request.status === "rejected" && !window.confirm(
      `This request was rejected: "${describeRejection(request.rejectionReason)}"\n\n${isFresher ? "Approve it as provisional anyway? They'll still need to submit their student ID card by the deadline." : "Approve it anyway?"}`
    )) return;
    run(
      (r) => approveKYCRequest(request.id, {
        overrideEligibility: overrideEligibility || undefined,
        takeOverClaim: takeOverClaim || undefined,
        reason: r || undefined,
      }),
      takeOverClaim,
      isFresher ? "Approved as provisional." : "Approved — fully verified."
    );
  };
  const reject = () => run((r) => rejectKYCRequest(request.id, r), true, "Rejected.");
  const revoke = () => {
    if (!window.confirm("Revoke this student's verification? Their listings will be held, their plan paused, and the Verified badge removed.")) return;
    run((r) => revokeKYC(request.id, r), true, "Verification revoked.");
  };
  const releaseClaim = () => {
    if (!clash?.claimKey) return;
    if (!window.confirm(`Release ${clash.claimKey} from the account that holds it?`)) return;
    run((r) => releaseKYCClaim(clash.claimKey, r), true, `Released ${clash.claimKey}.`);
  };

  const portal = request.ocrSummary?.portal;
  const library = request.ocrSummary?.library;
  const checks = request.autoCheck?.checks || {};
  const photoLabels = {
    front: documentType === "portal_screenshot" ? "Portal screenshot" : documentType === "library_card" ? "Library card — front" : "Front ID",
    back: documentType === "library_card" ? "Library card — back" : "Back ID",
  };
  const canApprove = request.status === "pending" || request.status === "rejected";
  const button = "flex-1 px-4 py-2.5 rounded-lg font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-indigo-50 to-white shrink-0">
          <h2 className="text-lg font-bold text-gray-900">KYC Request Review</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Student</h3>
            <Row label="Name on KYC">{request.fullName || "—"}</Row>
            <Row label={request.account ? "Account name" : "Account name (profile now)"}>
              {accountName || "—"}
              {request.account?.nameDiffers && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Differs from KYC name
                </span>
              )}
            </Row>
            <Row label="Account email"><span className="break-all">{accountEmail || "—"}</span></Row>
            <Row label="User ID"><span className="font-mono text-xs">{request.userId || request.id}</span></Row>
            <Row label="Route">{isFresher ? `Fresher — ${DOCUMENT_LABELS[documentType]}` : request.upgradeFrom === "provisional" ? "Student ID (upgrade from provisional)" : "Student ID card"}</Row>
            {request.matricNumber && <Row label="Matric number"><span className="font-mono">{request.matricNumber}</span></Row>}
            {request.tempMatric && <Row label="Temporary matric number"><span className="font-mono">{request.tempMatric}</span></Row>}
            {request.libraryCardNumber && <Row label="Library Card No"><span className="font-mono">{request.libraryCardNumber}</span></Row>}
            <Row label="Submitted">{formatDate(request.submittedDate?.getTime?.() ?? toMillis(request.submittedAt))}</Row>
            <Row label="Account now">{describeLevel(user)}</Row>
          </section>

          {/* Photos */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{DOCUMENT_LABELS[documentType]}{isFresher ? " and selfie" : ""}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <KycPhoto request={request} slot="front" label={photoLabels.front} />
              {(request.photos?.back || request.backID) && <KycPhoto request={request} slot="back" label={photoLabels.back} />}
              {request.photos?.selfie && (
                <KycPhoto
                  request={request}
                  slot="selfie"
                  label={`Selfie — ${request.selfieSource === "file" ? "from a file (camera was blocked)" : "live camera"}`}
                />
              )}
            </div>
            {isFresher && <p className="mt-2 text-xs text-gray-500">Compare the selfie with the photo on the document.</p>}
          </section>

          {/* What the automatic check found */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Automatic check</h3>
            {!isFresher && <p className="text-sm text-gray-700">{describeIdCheck(request.autoCheck)}</p>}
            {portal && (
              <div>
                <Row label="Name read">{portal.name || "—"}</Row>
                <Row label="Matric number read">{portal.matric || portal.matricRaw || "—"} ({checks.numberMatches ? "matches" : "doesn't match"})</Row>
                <Row label="Level">{portal.level ?? "unreadable"}</Row>
                <Row label="Session">{portal.session || "unreadable"} ({checks.sessionMatches ? "current" : "not current"})</Row>
                <Row label="Lead City University found">{yesNo(portal.institutionFound)}</Row>
                <Row label="portal.lcu.edu.ng visible">{yesNo(portal.portalHostFound)}</Row>
                {request.autoCheck?.state === "passed_review_sample" && (
                  <p className="mt-1 text-xs text-indigo-700">Passed every check — in review as part of the auto-pass sample.</p>
                )}
                {request.autoCheck?.state === "passed_launch_review" && (
                  <p className="mt-1 text-xs text-indigo-700">Passed every check — in review because auto-pass is off. Your decision helps measure OCR accuracy.</p>
                )}
              </div>
            )}
            {library && (
              <div>
                <Row label="Front: Lead City / University Librarian">{yesNo(library.frontMarkers?.leadCity)} / {yesNo(library.frontMarkers?.librarian)}</Row>
                <Row label="Back: property-of line">{yesNo(library.backMarkers?.property)}</Row>
                <Row label="Surname (handwriting, hint)">{library.surname || "unreadable"}</Row>
                <Row label="Other names (hint)">{library.otherNames || "unreadable"}</Row>
                <Row label="Year of entry (hint)">{library.yearOfEntry || "unreadable"}</Row>
                <p className="mt-1 text-xs text-gray-500">Check the Card No against what they typed. Handwriting reads are hints only.</p>
              </div>
            )}
            {isFresher && request.autoCheck?.state === "error" && (
              <p className="text-sm text-gray-700">The automatic check couldn't run ({request.autoCheck.message}). Review the photos directly.</p>
            )}
            {request.eligibility && (
              <div className="mt-2">
                <Row label="Level for the fresher route">{request.eligibility.derivedLevel ?? "unknown"} — eligible: {yesNo(request.eligibility.eligible)}</Row>
                {request.eligibility.overriddenBy && <Row label="Eligibility">overridden by an admin</Row>}
              </div>
            )}
          </section>

          {/* Number clash */}
          {clash && (
            <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Number already claimed:</span> <span className="font-mono">{clash.claimKey}</span> is held by account{" "}
                <span className="font-mono text-xs">{clash.holderUid}</span>
                {clash.holderLevel ? ` (${clash.holderLevel})` : " (not verified)"}.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={releaseClaim} disabled={processing} className="px-3 py-1.5 rounded-lg border border-amber-400 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50">
                  Release claim
                </button>
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="checkbox" checked={takeOverClaim} onChange={(e) => setTakeOverClaim(e.target.checked)} />
                  Approve and take over the claim
                </label>
              </div>
              <p className="text-xs text-gray-600">Both need a reason below, and are logged.</p>
            </section>
          )}

          {/* Status */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Request status</h3>
            <p className="text-sm text-gray-900">
              {request.status}
              {request.reviewMethod && <span className="ml-2 text-xs text-gray-500">{request.reviewMethod === "manual" ? "decided by an admin" : "decided automatically"}</span>}
            </p>
            {request.status === "rejected" && <p className="mt-1 text-sm text-gray-700">Reason: {describeRejection(request.rejectionReason)}</p>}
            {notEligible && canApprove && (
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={overrideEligibility} onChange={(e) => setOverrideEligibility(e.target.checked)} />
                {isFresher
                  ? "Approve provisionally anyway (e.g. a 300 level or older student who doesn't have their ID card yet)"
                  : "Override eligibility (I've checked this student)"}
              </label>
            )}
            {notEligible && canApprove && isFresher && (
              <p className="mt-1 text-xs text-gray-500">
                Like 100–200 level approvals, this is provisional: they get the same deadline to submit their student ID card.
                Add a reason below so it's on record.
              </p>
            )}
          </section>

          {history.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Earlier submissions ({history.length})</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {history.map((h) => (
                  <li key={h.id}>
                    {formatDate(toMillis(h.archivedAt))} — {DOCUMENT_LABELS[h.documentType] || "Student ID card"} — {h.status}
                    {h.rejectionReason ? ` (${describeRejection(h.rejectionReason)})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <label htmlFor="kycReason" className="text-sm font-semibold text-gray-700">
              Reason <span className="font-normal text-gray-500">(needed to reject, revoke or move a claim; sent to the student for rejections and revocations)</span>
            </label>
            <textarea
              id="kycReason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON_LENGTH))}
              disabled={processing}
              rows={2}
              placeholder="e.g. The photo is blurry — please upload a clearer photo of your document."
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{reason.length}/{MAX_REASON_LENGTH}</p>
          </section>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error.message}
              {error.data?.needsOverride && " Tick the override box above if you've checked."}
              {error.data?.conflict && " Release the claim, or tick \"Approve and take over the claim\" and add a reason."}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button onClick={onClose} disabled={processing} className={`${button} border border-gray-300 text-gray-700 hover:bg-white shadow-none`}>Close</button>
          {request.status === "pending" && (
            <button onClick={reject} disabled={processing} className={`${button} bg-red-600 text-white hover:bg-red-700`}>Reject</button>
          )}
          {canApprove && (
            <button onClick={approve} disabled={processing} className={`${button} bg-green-600 text-white hover:bg-green-700`}>
              {isFresher ? "Approve as provisional" : request.status === "rejected" ? "Approve anyway" : "Approve"}
            </button>
          )}
          {userCleared && (
            <button onClick={revoke} disabled={processing} className={`${button} bg-gray-800 text-white hover:bg-gray-900`}>Revoke</button>
          )}
        </div>
      </div>
    </div>
  );
}
