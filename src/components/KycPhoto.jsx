'use client'
import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseConfig";

const LEGACY_URL_FIELD = { front: "frontID", back: "backID" };

/**
 * One KYC photo in the review modal.
 *
 * Photos are private on Cloudinary (`photos.{front,back,selfie}` on the
 * request), so an <img> can't load them by URL: this fetches the bytes through
 * /api/kyc/photo with the admin's token — the web app logs every view — and
 * shows them as a blob URL. Requests from before the switch still carry public
 * frontID/backID URLs, which are shown directly. Both shapes are read so
 * nothing becomes unreviewable while photos are migrated.
 */
export default function KycPhoto({ request, slot, label }) {
  const hasPrivatePhoto = !!request?.photos?.[slot];
  const legacyUrl = hasPrivatePhoto ? null : request?.[LEGACY_URL_FIELD[slot]] || null;
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hasPrivatePhoto) return undefined;
    let cancelled = false;
    let objectUrl = null;
    setBlobUrl(null);
    setError(null);

    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("You must be logged in.");
        const idToken = await user.getIdToken();
        const query = new URLSearchParams({ userId: request.id, photo: slot });
        const response = await fetch(`/api/kyc/photo?${query}`, {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: "no-store",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Couldn't load the photo (${response.status})`);
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setBlobUrl(objectUrl);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasPrivatePhoto, request?.id, slot]);

  const src = hasPrivatePhoto ? blobUrl : legacyUrl;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="bg-indigo-50 px-3 py-2 border-b border-gray-200">
        <p className="text-xs font-semibold text-indigo-900">{label}</p>
      </div>
      {src ? (
        <>
          <img src={src} alt={label} className="w-full h-64 object-contain bg-white" />
          <div className="p-3 bg-white border-t border-gray-200">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Full Size
            </a>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 bg-gray-100 px-4 text-center">
          <p className={`text-sm ${error ? "text-red-600" : "text-gray-400"}`}>
            {error || (hasPrivatePhoto ? "Loading photo…" : `No ${label.toLowerCase()} uploaded`)}
          </p>
        </div>
      )}
    </div>
  );
}
