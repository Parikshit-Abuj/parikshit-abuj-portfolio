"use client";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import {
  newCustomEntry,
  sectionOrder,
  collectionLabels,
  type PortfolioContent,
  type CustomSection,
} from "@/lib/portfolio";
type Props = {
  content: PortfolioContent;
  setContent: Dispatch<SetStateAction<PortfolioContent>>;
};
function move<T>(rows: T[], index: number, delta: number) {
  const next = [...rows];
  [next[index], next[index + delta]] = [next[index + delta], next[index]];
  return next;
}
function Tools({
  title,
  index,
  count,
  onMove,
  onDelete,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (delta: number) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="entry-tools">
      <button
        className="icon-button"
        aria-label={`Move ${title} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={`Move ${title} down`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={16} />
      </button>
      {onDelete && (
        <button
          className="icon-button delete"
          aria-label={`Delete ${title}`}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
export function LayoutEditor({
  content,
  setContent,
  channel,
}: { channel: "resume" | "website" } & Props) {
  const ids = sectionOrder(content, channel);
  const label = (id: string) =>
    id === "summary"
      ? "Professional Summary"
      : id === "credentials"
        ? "Education and credentials"
        : id.startsWith("custom:")
          ? content.customSections?.find((s) => `custom:${s.id}` === id)
              ?.title || "Custom section"
          : collectionLabels[id as keyof typeof collectionLabels];
  return (
    <>
      <p>
        Arrange sections for your {channel}. This order is independent of the
        other layout. Empty or hidden sections are skipped.
      </p>
      <div className="editor-list">
        {ids.map((id, index) => (
          <div className="layout-row" key={id}>
            <strong>{label(id)}</strong>
            <Tools
              title={`${label(id)} in ${channel}`}
              index={index}
              count={ids.length}
              onMove={(delta) =>
                setContent((p) => ({
                  ...p,
                  [channel]: { sectionOrder: move(ids, index, delta) },
                }))
              }
            />
          </div>
        ))}
      </div>
      <button
        className="button secondary"
        onClick={() =>
          setContent((p) => ({ ...p, [channel]: { sectionOrder: [] } }))
        }
      >
        Restore default order
      </button>
    </>
  );
}
export function CustomEditor({
  content,
  setContent,
  confirmDelete,
}: Props & { confirmDelete: (title: string, action: () => void) => void }) {
  const sections = content.customSections ?? [];
  function update(id: string, change: (s: CustomSection) => CustomSection) {
    setContent((p) => ({
      ...p,
      customSections: (p.customSections ?? []).map((s) =>
        s.id === id ? change(s) : s,
      ),
    }));
  }
  return (
    <>
      <p>
        Create Achievements, Awards, Volunteering, or another section. Display
        switches control placement; resume-only content is still public in the
        downloadable PDF.
      </p>
      <button
        className="button secondary"
        onClick={() =>
          setContent((p) => ({
            ...p,
            customSections: [
              ...(p.customSections ?? []),
              {
                id: crypto.randomUUID(),
                title: "Achievements",
                visible: true,
                showOnWebsite: true,
                showOnResume: true,
                entries: [],
              },
            ],
          }))
        }
      >
        <Plus size={16} /> Add section
      </button>
      {sections.map((s) => (
        <section className="custom-section" key={s.id}>
          <div className="entry-header">
            <label className="field">
              <span>Section title</span>
              <input
                value={s.title}
                onChange={(e) =>
                  update(s.id, (s) => ({ ...s, title: e.target.value }))
                }
              />
            </label>
            <button
              className="button secondary"
              onClick={() =>
                confirmDelete(s.title, () =>
                  setContent((p) => {
                    const removed = `custom:${s.id}`;
                    return {
                      ...p,
                      customSections: (p.customSections ?? []).filter(
                        (x) => x.id !== s.id,
                      ),
                      resume: {
                        sectionOrder: sectionOrder(p, "resume").filter(
                          (id) => id !== removed,
                        ),
                      },
                      website: {
                        sectionOrder: sectionOrder(p, "website").filter(
                          (id) => id !== removed,
                        ),
                      },
                    };
                  }),
                )
              }
            >
              Delete section
            </button>
          </div>
          <div className="entry-toggles">
            {(["visible", "showOnWebsite", "showOnResume"] as const).map(
              (key) => (
                <label className="toggle-label" key={key}>
                  <input
                    type="checkbox"
                    checked={s[key]}
                    onChange={(e) =>
                      update(s.id, (s) => ({ ...s, [key]: e.target.checked }))
                    }
                  />
                  {key === "visible"
                    ? "Visible when published"
                    : key === "showOnWebsite"
                      ? "Show on website"
                      : "Show on resume"}
                </label>
              ),
            )}
          </div>
          {s.entries.map((entry, index) => (
            <article
              className={`entry-card ${!entry.visible ? "hidden-entry" : ""}`}
              key={entry.id}
            >
              <div className="entry-header">
                <h3>{entry.title || `Entry ${index + 1}`}</h3>
                <Tools
                  title={entry.title || `Entry ${index + 1}`}
                  index={index}
                  count={s.entries.length}
                  onMove={(delta) =>
                    update(s.id, (s) => ({
                      ...s,
                      entries: move(s.entries, index, delta),
                    }))
                  }
                  onDelete={() =>
                    confirmDelete(entry.title || "this entry", () =>
                      update(s.id, (s) => ({
                        ...s,
                        entries: s.entries.filter((e) => e.id !== entry.id),
                      })),
                    )
                  }
                />
              </div>
              <div className="field-grid">
                {(
                  [
                    "title",
                    "organization",
                    "date",
                    "description",
                    "bullets",
                    "url",
                  ] as const
                ).map((key) => (
                  <label
                    className={`field ${key === "description" || key === "bullets" ? "wide" : ""}`}
                    key={key}
                  >
                    <span>
                      {
                        {
                          title: "Entry title",
                          organization: "Organization (optional)",
                          date: "Date or period (optional)",
                          description: "Description (optional)",
                          bullets: "Accomplishments — one per line",
                          url: "Link (optional)",
                        }[key]
                      }
                    </span>
                    {key === "description" || key === "bullets" ? (
                      <textarea
                        rows={4}
                        value={
                          Array.isArray(entry[key])
                            ? (entry[key] as string[]).join("\n")
                            : String(entry[key])
                        }
                        onChange={(e) =>
                          update(s.id, (s) => ({
                            ...s,
                            entries: s.entries.map((x) =>
                              x.id === entry.id
                                ? {
                                    ...x,
                                    [key]:
                                      key === "bullets"
                                        ? e.target.value.split("\n")
                                        : e.target.value,
                                  }
                                : x,
                            ),
                          }))
                        }
                      />
                    ) : (
                      <input
                        type={key === "url" ? "url" : "text"}
                        value={entry[key]}
                        onChange={(e) =>
                          update(s.id, (s) => ({
                            ...s,
                            entries: s.entries.map((x) =>
                              x.id === entry.id
                                ? { ...x, [key]: e.target.value }
                                : x,
                            ),
                          }))
                        }
                      />
                    )}
                  </label>
                ))}
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={entry.visible}
                  onChange={(e) =>
                    update(s.id, (s) => ({
                      ...s,
                      entries: s.entries.map((x) =>
                        x.id === entry.id
                          ? { ...x, visible: e.target.checked }
                          : x,
                      ),
                    }))
                  }
                />{" "}
                Visible when published
              </label>
            </article>
          ))}
          <button
            className="button secondary"
            onClick={() =>
              update(s.id, (s) => ({
                ...s,
                entries: [...s.entries, newCustomEntry()],
              }))
            }
          >
            <Plus size={16} /> Add entry to {s.title}
          </button>
        </section>
      ))}
    </>
  );
}
export function PhotoEditor({ content, setContent }: Props) {
  const [preview, setPreview] = useState<{ path: string; url: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const r = await fetch("/admin/profile-photo", {
        method: "POST",
        body: form,
      });
      const value = await r.json();
      if (!r.ok) throw new Error(value.error || "Upload failed.");
      setContent((p) => ({
        ...p,
        profile: { ...p.profile, photoPath: value.path },
      }));
      setPreview({ path: value.path, url: URL.createObjectURL(file) });
      setMessage("Photo uploaded. Save your draft, preview, then publish.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="photo-editor">
      <h3>Website portrait</h3>
      <p>
        Optional, website only. JPEG, PNG, or WebP, up to 3 MB. The resume stays
        photo-free.
      </p>
      {content.profile.photoPath && (
        <img
          src={
            (preview?.path === content.profile.photoPath
              ? preview.url
              : null) ||
            `/admin/profile-photo?v=${encodeURIComponent(content.profile.photoPath)}`
          }
          alt="Draft portrait"
          width={104}
          height={104}
        />
      )}
      <label className="field">
        <span>Upload or replace portrait</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <p role="status">Uploading…</p>}
      {message && <p role="status">{message}</p>}
      {content.profile.photoPath && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setPreview(null);
            setContent((p) => ({
              ...p,
              profile: { ...p.profile, photoPath: undefined },
            }));
          }}
        >
          Remove portrait from draft
        </button>
      )}
    </div>
  );
}
