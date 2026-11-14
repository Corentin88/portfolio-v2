import { describe, expect, it } from "vitest";
import {
  PUBLICATION_ERRORS,
  projectDeletionError,
  projectStatusError,
  statusDates,
  versionWithdrawalError,
} from "@/features/projects/publication";

const now = new Date("2026-11-13T10:00:00Z");
const earlier = new Date("2025-01-01T00:00:00Z");

describe("statusDates", () => {
  it("date la première publication", () => {
    expect(
      statusDates(
        { status: "DRAFT", publishedAt: null, archivedAt: null },
        "PUBLISHED",
        now,
      ),
    ).toEqual({ publishedAt: now, archivedAt: null });
  });

  it("conserve la date de première publication lors d'une republication", () => {
    expect(
      statusDates(
        { status: "DRAFT", publishedAt: earlier, archivedAt: null },
        "PUBLISHED",
        now,
      ).publishedAt,
    ).toBe(earlier);
  });

  it("renseigne archivedAt à l'archivage sans l'écraser ensuite", () => {
    expect(
      statusDates(
        { status: "PUBLISHED", publishedAt: earlier, archivedAt: null },
        "ARCHIVED",
        now,
      ),
    ).toEqual({ publishedAt: earlier, archivedAt: now });
    expect(
      statusDates(
        { status: "ARCHIVED", publishedAt: null, archivedAt: earlier },
        "ARCHIVED",
        now,
      ).archivedAt,
    ).toBe(earlier);
  });

  it("vide archivedAt à la restauration", () => {
    expect(
      statusDates(
        { status: "ARCHIVED", publishedAt: earlier, archivedAt: earlier },
        "DRAFT",
        now,
      ),
    ).toEqual({ publishedAt: earlier, archivedAt: null });
  });
});

describe("règles de publication", () => {
  it("refuse de publier un projet sans version publiée", () => {
    expect(projectStatusError("PUBLISHED", 0)).toBe(
      PUBLICATION_ERRORS.projectWithoutVersion,
    );
    expect(projectStatusError("PUBLISHED", 1)).toBeNull();
    expect(projectStatusError("DRAFT", 0)).toBeNull();
    expect(projectStatusError("ARCHIVED", 0)).toBeNull();
  });

  it("refuse de retirer la dernière version publiée d'un projet publié", () => {
    for (const next of ["DRAFT", "ARCHIVED", "DELETED"] as const) {
      expect(
        versionWithdrawalError({
          versionStatus: "PUBLISHED",
          next,
          projectStatus: "PUBLISHED",
          publishedVersionCount: 1,
        }),
      ).toBe(PUBLICATION_ERRORS.lastPublishedVersion);
    }
  });

  it("autorise le retrait s'il reste une autre version publiée", () => {
    expect(
      versionWithdrawalError({
        versionStatus: "PUBLISHED",
        next: "DRAFT",
        projectStatus: "PUBLISHED",
        publishedVersionCount: 2,
      }),
    ).toBeNull();
  });

  it("autorise tout retrait sur un projet non publié", () => {
    expect(
      versionWithdrawalError({
        versionStatus: "PUBLISHED",
        next: "DELETED",
        projectStatus: "DRAFT",
        publishedVersionCount: 1,
      }),
    ).toBeNull();
  });

  it("ne bloque ni la modification d'une version publiée ni un brouillon", () => {
    expect(
      versionWithdrawalError({
        versionStatus: "PUBLISHED",
        next: "PUBLISHED",
        projectStatus: "PUBLISHED",
        publishedVersionCount: 1,
      }),
    ).toBeNull();
    expect(
      versionWithdrawalError({
        versionStatus: "DRAFT",
        next: "DELETED",
        projectStatus: "PUBLISHED",
        publishedVersionCount: 1,
      }),
    ).toBeNull();
  });

  it("refuse la suppression d'un projet publié", () => {
    expect(projectDeletionError("PUBLISHED")).toBe(
      PUBLICATION_ERRORS.deletePublishedProject,
    );
    expect(projectDeletionError("DRAFT")).toBeNull();
    expect(projectDeletionError("ARCHIVED")).toBeNull();
  });
});
