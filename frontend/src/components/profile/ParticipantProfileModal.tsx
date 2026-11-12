"use client";

import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  Building2,
  X,
  MapPin,
  Globe,
  Briefcase,
  Shield,
  Layers,
  Wrench,
  Award,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { IndividualProfile, Business, ProfileVisibility } from "@/types";
import {
  fetchPublicIndividualProfile,
  fetchPublicBusinessProfile,
} from "@/lib/api";

export interface ParticipantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantId: string | number | null;
  participantType: "INDIVIDUAL" | "BUSINESS";
}

export const ParticipantProfileModal: React.FC<ParticipantProfileModalProps> = ({
  isOpen,
  onClose,
  participantId,
  participantType,
}) => {
  const [individualProfile, setIndividualProfile] =
    useState<IndividualProfile | null>(null);
  const [businessProfile, setBusinessProfile] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !participantId) {
      setIndividualProfile(null);
      setBusinessProfile(null);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    const loadProfile = async () => {
      try {
        if (participantType === "INDIVIDUAL") {
          const data = await fetchPublicIndividualProfile(String(participantId));
          if (isMounted) {
            setIndividualProfile(data);
            setBusinessProfile(null);
          }
        } else {
          const data = await fetchPublicBusinessProfile(Number(participantId));
          if (isMounted) {
            setBusinessProfile(data);
            setIndividualProfile(null);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg =
            err instanceof Error
              ? err.message
              : "Unable to load participant profile.";
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, participantId, participantType]);

  if (!isOpen) return null;

  const isIndividual = participantType === "INDIVIDUAL";
  const name = isIndividual
    ? "Independent Professional"
    : businessProfile?.name || "Organization Profile";

  const headline = isIndividual
    ? individualProfile?.headline
    : businessProfile?.business_type || "Business Partner";

  const description = isIndividual
    ? individualProfile?.bio
    : businessProfile?.description;

  const location = isIndividual
    ? individualProfile?.location
    : [businessProfile?.location, businessProfile?.country]
        .filter(Boolean)
        .join(", ");

  const industry = isIndividual
    ? individualProfile?.industry
    : businessProfile?.industry;

  const visibility: ProfileVisibility = isIndividual
    ? individualProfile?.visibility || "PRIVATE"
    : businessProfile?.visibility || "PRIVATE";

  const skills = isIndividual
    ? individualProfile?.skills || []
    : businessProfile?.skills || [];

  const services = isIndividual
    ? individualProfile?.services || []
    : businessProfile?.services || [];

  const resources = isIndividual
    ? individualProfile?.resources || []
    : businessProfile?.resources || [];

  const experience = isIndividual
    ? individualProfile?.experience || []
    : businessProfile?.experience || [];

  const interests = isIndividual
    ? individualProfile?.interests || []
    : businessProfile?.interests || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile modal"
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500">
              Loading participant profile...
            </p>
          </div>
        ) : errorMessage ? (
          <div className="py-10 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Profile Unavailable
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header / Avatar / Identity */}
            <div className="flex items-start gap-4 pr-8">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${
                  isIndividual
                    ? "bg-gradient-to-tr from-blue-600 to-indigo-600"
                    : "bg-gradient-to-tr from-emerald-600 to-teal-600"
                }`}
              >
                {isIndividual ? (
                  <UserIcon className="h-6 w-6" />
                ) : (
                  <Building2 className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    id="participant-modal-title"
                    className="text-base sm:text-lg font-black text-slate-900 truncate"
                  >
                    {name}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                      visibility === "PUBLIC"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : visibility === "AUTHENTICATED"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    <Shield className="h-2.5 w-2.5" />
                    <span>{visibility}</span>
                  </span>
                </div>

                {headline && (
                  <p className="text-xs font-semibold text-slate-600">
                    {headline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-500 font-medium">
                  {industry && (
                    <span className="inline-flex items-center gap-1">
                      <Briefcase className="h-3 w-3 text-slate-400" />
                      <span>{industry}</span>
                    </span>
                  )}
                  {location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      <span>{location}</span>
                    </span>
                  )}
                  {!isIndividual && businessProfile?.website && (
                    <a
                      href={businessProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bio / Description */}
            {description && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-700 leading-relaxed">
                <p>{description}</p>
              </div>
            )}

            {/* Capability Dimensions */}
            <div className="space-y-4 pt-1">
              {/* Skills */}
              {skills.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    <span>Skills & Competencies</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services Offered */}
              {services.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-emerald-600" />
                    <span>Services Offered</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((service) => (
                      <span
                        key={service}
                        className="rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools & Resources */}
              {resources.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="h-3 w-3 text-purple-600" />
                    <span>Equipment & Specialized Resources</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resources.map((resource) => (
                      <span
                        key={resource}
                        className="rounded-lg bg-purple-50 border border-purple-200/80 px-2.5 py-1 text-xs font-semibold text-purple-700"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Highlights */}
              {experience.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="h-3 w-3 text-amber-600" />
                    <span>Experience & Milestones</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {experience.map((exp) => (
                      <span
                        key={exp}
                        className="rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-800"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests */}
              {interests.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-violet-600" />
                    <span>Collaboration Interests</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-lg bg-violet-50 border border-violet-200/80 px-2.5 py-1 text-xs font-semibold text-violet-700"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
