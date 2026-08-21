"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api/client";
import {
  buildAvatarCandidateGenerationRequest,
  getAvatarImportReadiness,
  getDefaultAvatarImportName,
  type AvatarCandidateSet,
} from "@/lib/avatar-workflow";
import type { Avatar, AvatarCreatedHandoff, AvatarJobResult } from "@/lib/avatar-picker-model";
import {
  AvatarImportPanel,
  type AvatarImportWorkspace,
} from "@/components/avatar-picker-import";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Seed Reference Image could not be read."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Seed Reference Image could not be read."));
    reader.readAsDataURL(file);
  });
}

export function AvatarImportMode({ handoff }: { handoff: AvatarCreatedHandoff }) {
  const { onCreated, onBack } = handoff;
  const [importRawJson, setImportRawJson] = useState("");
  const [importAvatarName, setImportAvatarName] = useState("Imported Avatar");
  const [seedReferenceImages, setSeedReferenceImages] = useState<File[]>([]);
  const [avatarCandidateSets, setAvatarCandidateSets] = useState<AvatarCandidateSet[]>([]);
  const [importCandidateJobId, setImportCandidateJobId] = useState<string | null>(null);
  const [isGeneratingImportCandidates, setIsGeneratingImportCandidates] = useState(false);
  const [importGenerationError, setImportGenerationError] = useState<string | null>(null);

  const handleImportJsonFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setImportGenerationError(null);
    try {
      const rawJson = await file.text();
      setImportRawJson(rawJson);
      setImportAvatarName(getDefaultAvatarImportName(rawJson));
    } catch {
      setImportGenerationError("Avatar Profile JSON file could not be read.");
    }
  };

  const handleSeedReferenceImages = (files: FileList | null) => {
    if (!files) return;
    setImportGenerationError(null);
    setSeedReferenceImages((current) => [...current, ...Array.from(files)]);
  };

  const handleRemoveSeedReferenceImage = (index: number) => {
    setImportGenerationError(null);
    setSeedReferenceImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleGenerateImportCandidates = async () => {
    const readiness = getAvatarImportReadiness(importRawJson, seedReferenceImages.length);
    if (!readiness.canGenerateCandidates) return;

    setIsGeneratingImportCandidates(true);
    setImportGenerationError(null);
    try {
      const seedReferenceImageUrls = await Promise.all(
        seedReferenceImages.map(readFileAsDataUrl)
      );
      const result = await apiPost<{ id: string }>("/api/generate/images", buildAvatarCandidateGenerationRequest({
        rawJson: importRawJson,
        seedReferenceImageUrls,
      }));
      setImportCandidateJobId(result.id);
    } catch {
      setImportGenerationError("Candidate generation failed. Your inputs are still available for retry.");
      setIsGeneratingImportCandidates(false);
    }
  };

  useEffect(() => {
    if (!importCandidateJobId) return;

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const result = await apiGet<AvatarJobResult>(`/api/jobs/${importCandidateJobId}`);
        if (!active) return;

        if (result.status === "completed") {
          setAvatarCandidateSets((current) => [
            ...current,
            {
              jobId: result.id,
              candidates: result.outputs
                .filter((output) => output.type === "image")
                .map((output) => ({ fileId: output.id })),
            },
          ]);
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        if (result.status === "failed") {
          setImportGenerationError(
            result.error || "Candidate generation failed. Your inputs are still available for retry."
          );
          setImportCandidateJobId(null);
          setIsGeneratingImportCandidates(false);
          return;
        }

        timeoutId = setTimeout(poll, 3000);
      } catch {
        if (!active) return;
        timeoutId = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [importCandidateJobId]);

  const handleAcceptImportCandidate = async (fileId: string) => {
    try {
      const result = await apiPost<{ avatar: Avatar }>("/api/avatars/import-candidate", {
        fileId,
        name: importAvatarName,
        rawAvatarProfileJson: importRawJson,
        seedReferenceImages: seedReferenceImages.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
        candidateFileIds: avatarCandidateSets.flatMap((set) =>
          set.candidates.map((candidate) => candidate.fileId)
        ),
      });
      onCreated(result.avatar);
    } catch (err) {
      console.error("Failed to accept imported avatar candidate:", err);
      setImportGenerationError("Candidate could not be saved as an Avatar.");
    }
  };

  const workspace: AvatarImportWorkspace = {
    rawJson: importRawJson,
    avatarName: importAvatarName,
    seedReferenceImages,
    candidateSets: avatarCandidateSets,
    isGeneratingCandidates: isGeneratingImportCandidates,
    generationError: importGenerationError,
    onAvatarNameChange: (value) => {
      setImportGenerationError(null);
      setImportAvatarName(value.slice(0, 40));
    },
    onRawJsonChange: (value) => {
      setImportGenerationError(null);
      setImportRawJson(value);
      setImportAvatarName(getDefaultAvatarImportName(value));
    },
    onJsonFileChange: handleImportJsonFile,
    onSeedReferenceImagesChange: handleSeedReferenceImages,
    onRemoveSeedReferenceImage: handleRemoveSeedReferenceImage,
    onGenerateCandidates: handleGenerateImportCandidates,
    onAcceptCandidate: handleAcceptImportCandidate,
  };

  return <AvatarImportPanel workspace={workspace} onBack={onBack} />;
}
