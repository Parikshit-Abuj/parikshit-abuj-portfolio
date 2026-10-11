"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Download,
  Eye,
  LogOut,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  collectionLabels,
  initials,
  newEntry,
  type CollectionKey,
  type PortfolioContent,
  type PortfolioDraft,
} from "@/lib/portfolio";
import {
  publishAction,
  saveDraftAction,
  signOutAction,
} from "@/app/admin/actions";

type FieldSpec = {
  key: string;
  label: string;
  type?: "textarea" | "array" | "month" | "year" | "url" | "select";
  wide?: boolean;
  hint?: string;
};
const fields: Record<CollectionKey, FieldSpec[]> = {
  projects: [
    { key: "name", label: "Project name" },
    { key: "status", label: "Status", type: "select" },
    {
      key: "summary",
      label: "Project description",
      type: "textarea",
      wide: true,
    },
    {
      key: "technologies",
      label: "Technologies",
      type: "array",
      hint: "One technology per line",
    },
    {
      key: "bullets",
      label: "Highlights",
      type: "array",
      hint: "One accomplishment per line",
    },
    { key: "demoUrl", label: "Live demo URL", type: "url" },
    { key: "githubUrl", label: "GitHub URL", type: "url" },
  ],
  experiences: [
    { key: "company", label: "Company" },
    { key: "role", label: "Job title" },
    { key: "startDate", label: "Start date", type: "month" },
    { key: "endDate", label: "End date", type: "month" },
    { key: "location", label: "Location (optional)", wide: true },
    {
      key: "bullets",
      label: "Responsibilities and accomplishments",
      type: "array",
      wide: true,
      hint: "One bullet per line",
    },
  ],
  skillGroups: [
    { key: "name", label: "Category name", wide: true },
    {
      key: "skills",
      label: "Skills",
      type: "array",
      wide: true,
      hint: "Add, edit, or remove a skill on each line",
    },
  ],
  education: [
    { key: "qualification", label: "Qualification" },
    { key: "institution", label: "Institution / board" },
    { key: "startYear", label: "Start year (optional)", type: "year" },
    { key: "endYear", label: "End year (optional)", type: "year" },
  ],
  certifications: [
    { key: "name", label: "Certification" },
    { key: "issuer", label: "Issuer (optional)" },
    { key: "year", label: "Year (optional)", type: "year" },
    { key: "url", label: "Certificate URL (optional)", type: "url" },
  ],
  languages: [{ key: "name", label: "Language", wide: true }],
};
const profileFields: FieldSpec[] = [
  { key: "name", label: "Full name" },
  {
    key: "title",
    label: "Profession / headline",
    hint: "For example: Full-Stack Developer or QA Engineer",
  },
  {
    key: "summary",
    label: "Professional summary",
    type: "textarea",
    wide: true,
  },
  { key: "email", label: "Public contact email" },
  { key: "phone", label: "Public phone (optional)" },
  { key: "location", label: "Location (optional)" },
  { key: "availability", label: "Short availability note (optional)" },
  { key: "github", label: "GitHub profile URL", type: "url" },
  { key: "linkedin", label: "LinkedIn profile URL", type: "url" },
];
function EditorField({
  spec,
  value,
  onChange,
  disabled = false,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}) {
  const rendered = Array.isArray(value)
    ? value.join("\n")
    : String(value ?? "");
  return (
    <label className={`field ${spec.wide ? "wide" : ""}`}>
      <span>{spec.label}</span>
      {spec.hint && <small>{spec.hint}</small>}
      {spec.type === "textarea" || spec.type === "array" ? (
        <textarea
          rows={spec.type === "array" ? 4 : 5}
          value={rendered}
          onChange={(event) =>
            onChange(
              spec.type === "array"
                ? event.target.value.split("\n")
                : event.target.value,
            )
          }
          disabled={disabled}
        />
      ) : spec.type === "select" ? (
        <select
          value={rendered}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">No status label</option>
          <option>In progress</option>
          <option>Completed</option>
        </select>
      ) : (
        <input
          type={
            spec.type === "month"
              ? "month"
              : spec.type === "url"
                ? "url"
                : "text"
          }
          inputMode={spec.type === "year" ? "numeric" : undefined}
          maxLength={spec.type === "year" ? 4 : undefined}
          value={rendered}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      )}
    </label>
  );
}
type Confirmation = {
  title: string;
  body: string;
  label: string;
  danger?: boolean;
  confirm: () => void | Promise<void>;
};
function ConfirmationDialog({
  value,
  close,
}: {
  value: Confirmation;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={close}
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title">{value.title}</h2>
      <p>{value.body}</p>
      <div className="modal-actions">
        <button className="button secondary" autoFocus onClick={close}>
          Cancel
        </button>
        <button
          className={`button ${value.danger ? "danger" : "primary"}`}
          onClick={() => {
            close();
            void value.confirm();
          }}
        >
          {value.label}
        </button>
      </div>
    </dialog>
  );
}
export function Studio({
  initialDraft,
  initialPublished,
}: {
  initialDraft: PortfolioDraft;
  initialPublished: { source_revision: number; published_at: string } | null;
}) {
  const [content, setContent] = useState(initialDraft.content),
    [saved, setSaved] = useState(initialDraft.content);
  const [revision, setRevision] = useState(initialDraft.revision),
    [savedAt, setSavedAt] = useState(initialDraft.updated_at);
  const [published, setPublished] = useState(initialPublished),
    [active, setActive] = useState<"profile" | CollectionKey>("profile");
  const [busy, setBusy] = useState<"save" | "publish" | "logout" | null>(null);
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const dirty = JSON.stringify(content) !== JSON.stringify(saved),
    hasUnpublished = revision !== published?.source_revision;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function updateEntry(
    section: CollectionKey,
    id: string,
    key: string,
    value: unknown,
  ) {
    setContent((previous) => ({
      ...previous,
      [section]: previous[section].map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [key]: value,
              ...(key === "current" && value ? { endDate: "" } : {}),
            }
          : entry,
      ),
    }));
  }
  function move(section: CollectionKey, index: number, direction: number) {
    setContent((previous) => {
      const entries = [...previous[section]];
      [entries[index], entries[index + direction]] = [
        entries[index + direction],
        entries[index],
      ];
      return { ...previous, [section]: entries };
    });
  }
  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const result = await saveDraftAction(content, revision);
      if (result.ok) {
        setContent(result.data.content);
        setSaved(result.data.content);
        setRevision(result.data.revision);
        setSavedAt(result.data.updatedAt);
        setMessage({
          kind: "success",
          text: "Draft saved. Preview it, then publish when you’re ready.",
        });
      } else setMessage({ kind: "error", text: result.error });
    } catch {
      setMessage({
        kind: "error",
        text: "The connection was interrupted. Your edits are still here; please retry.",
      });
    } finally {
      setBusy(null);
    }
  }
  async function publish() {
    setBusy("publish");
    setMessage(null);
    try {
      const result = await publishAction(revision);
      if (result.ok) {
        setPublished({
          source_revision: result.data.revision,
          published_at: result.data.publishedAt,
        });
        setMessage({
          kind: "success",
          text: "Published. Your portfolio and downloadable resume now use this version.",
        });
      } else setMessage({ kind: "error", text: result.error });
    } catch {
      setMessage({
        kind: "error",
        text: "Publishing could not be confirmed. Reload to check its status before retrying.",
      });
    } finally {
      setBusy(null);
    }
  }
  function requestLogout() {
    const logout = async () => {
      setBusy("logout");
      await signOutAction();
    };
    if (dirty)
      setConfirmation({
        title: "Leave unsaved changes?",
        body: "Your latest edits have not been saved. Signing out will discard those edits.",
        label: "Sign out",
        danger: true,
        confirm: logout,
      });
    else void logout();
  }
  const date = (value: string) =>
    new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <div className="studio">
      <header className="studio-header">
        <div className="studio-brand">
          <span className="monogram">
            {initials(content.profile.name)}
            <span>.</span>
          </span>
          <div>
            <h1>Portfolio studio</h1>
            <p>Your career, in your own words.</p>
          </div>
        </div>
        <div className="studio-header-actions">
          <a
            className="public-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
          >
            View public portfolio <ArrowUpRight size={14} />
          </a>
          <button
            className="button small secondary"
            onClick={requestLogout}
            disabled={Boolean(busy)}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>
      <div className="studio-layout">
        <aside className="studio-sidebar">
          <nav className="studio-nav" aria-label="Editor sections">
            <button
              className={active === "profile" ? "active" : ""}
              onClick={() => setActive("profile")}
            >
              Profile & contact
            </button>
            {(Object.keys(collectionLabels) as CollectionKey[]).map(
              (section) => (
                <button
                  className={active === section ? "active" : ""}
                  key={section}
                  onClick={() => setActive(section)}
                >
                  {collectionLabels[section]}
                  <span className="count">{content[section].length}</span>
                </button>
              ),
            )}
          </nav>
          <div className="sidebar-note">
            <strong>Draft → Preview → Publish</strong>Saved edits stay private
            until you publish. Hidden entries are excluded from both the
            portfolio and resume.
            <br />
            <br />
            {published
              ? `Last published ${date(published.published_at)}`
              : "Nothing published yet."}
          </div>
        </aside>
        <section
          className="editor-panel"
          aria-label={`${active === "profile" ? "Profile" : collectionLabels[active]} editor`}
        >
          {message && (
            <div
              className={`message ${message.kind}`}
              role={message.kind === "error" ? "alert" : "status"}
            >
              {message.text}
            </div>
          )}
          <div className="editor-heading">
            <div>
              <h2>
                {active === "profile"
                  ? "Profile & contact"
                  : collectionLabels[active]}
              </h2>
              <p>
                {active === "profile"
                  ? "Update your profession, summary, and the ways people can reach you."
                  : "Make it yours. Add, edit, reorder, or remove an entry."}
              </p>
            </div>
            {active !== "profile" && (
              <button
                className="button small secondary"
                disabled={Boolean(busy)}
                onClick={() =>
                  setContent((previous) => ({
                    ...previous,
                    [active]: [...previous[active], newEntry(active)],
                  }))
                }
              >
                <Plus size={15} />
                Add entry
              </button>
            )}
          </div>
          <fieldset disabled={Boolean(busy)} className="editor-fieldset">
            {active === "profile" ? (
              <div className="field-grid">
                {profileFields.map((spec) => (
                  <EditorField
                    key={spec.key}
                    spec={spec}
                    value={
                      content.profile[spec.key as keyof typeof content.profile]
                    }
                    onChange={(value) =>
                      setContent((previous) => ({
                        ...previous,
                        profile: { ...previous.profile, [spec.key]: value },
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="editor-list">
                {content[active].length === 0 && (
                  <div className="editor-empty">
                    <p>
                      No entries yet. This section stays out of your public
                      portfolio and resume.
                    </p>
                    <button
                      className="button small secondary"
                      onClick={() =>
                        setContent((previous) => ({
                          ...previous,
                          [active]: [newEntry(active)],
                        }))
                      }
                    >
                      <Plus size={15} />
                      Add your first entry
                    </button>
                  </div>
                )}
                {content[active].map((entry, index) => {
                  const record = entry as unknown as Record<string, unknown>,
                    title = String(
                      record.name ||
                        record.company ||
                        record.qualification ||
                        `Entry ${index + 1}`,
                    );
                  return (
                    <article
                      className={`entry-card ${!entry.visible ? "hidden-entry" : ""}`}
                      key={entry.id}
                    >
                      <div className="entry-header">
                        <h3>{title}</h3>
                        <div className="entry-tools">
                          <button
                            className="icon-button"
                            aria-label={`Move ${title} up`}
                            disabled={index === 0}
                            onClick={() => move(active, index, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Move ${title} down`}
                            disabled={index === content[active].length - 1}
                            onClick={() => move(active, index, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            className="icon-button delete"
                            aria-label={`Delete ${title}`}
                            onClick={() =>
                              setConfirmation({
                                title: "Delete this entry?",
                                body: `“${title}” will be removed from your draft. Save and publish to remove it from the portfolio and resume.`,
                                label: "Delete entry",
                                danger: true,
                                confirm: () =>
                                  setContent((previous) => ({
                                    ...previous,
                                    [active]: previous[active].filter(
                                      (item) => item.id !== entry.id,
                                    ),
                                  })),
                              })
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="field-grid">
                        {fields[active].map((spec) => (
                          <EditorField
                            key={spec.key}
                            spec={spec}
                            value={record[spec.key]}
                            onChange={(value) =>
                              updateEntry(active, entry.id, spec.key, value)
                            }
                            disabled={
                              spec.key === "endDate" && Boolean(record.current)
                            }
                          />
                        ))}
                      </div>
                      <div className="entry-toggles">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            checked={entry.visible}
                            onChange={(event) =>
                              updateEntry(
                                active,
                                entry.id,
                                "visible",
                                event.target.checked,
                              )
                            }
                          />
                          Show in portfolio & resume
                        </label>
                        {active === "projects" && (
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={Boolean(record.featured)}
                              onChange={(event) =>
                                updateEntry(
                                  active,
                                  entry.id,
                                  "featured",
                                  event.target.checked,
                                )
                              }
                            />
                            Featured project
                          </label>
                        )}
                        {active === "experiences" && (
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={Boolean(record.current)}
                              onChange={(event) =>
                                updateEntry(
                                  active,
                                  entry.id,
                                  "current",
                                  event.target.checked,
                                )
                              }
                            />
                            I currently work here
                          </label>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </fieldset>
        </section>
      </div>
      <div className="save-bar">
        <div className="save-state" aria-live="polite">
          <strong>
            {dirty
              ? "● Unsaved changes"
              : hasUnpublished
                ? "● Saved draft · unpublished changes"
                : "✓ Your public version is up to date"}
          </strong>
          <span>
            Draft saved {date(savedAt)} · revision {revision}
          </span>
        </div>
        <div className="save-actions">
          {dirty && (
            <button
              className="button small secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                setConfirmation({
                  title: "Reset unsaved changes?",
                  body: "The editor will return to your last saved draft. Your published portfolio stays as it is.",
                  label: "Reset changes",
                  danger: true,
                  confirm: () => {
                    setContent(saved);
                    setMessage(null);
                  },
                })
              }
            >
              Reset changes
            </button>
          )}
          <button
            className="button small secondary"
            disabled={Boolean(busy) || dirty}
            title={
              dirty
                ? "Save your changes before previewing."
                : "Preview your saved draft"
            }
            onClick={() =>
              window.open("/admin/preview", "_blank", "noopener,noreferrer")
            }
          >
            <Eye size={15} />
            Preview
          </button>
          <a
            className={`button small secondary ${dirty || busy ? "disabled-link" : ""}`}
            href="/admin/resume"
            aria-disabled={dirty || Boolean(busy)}
            onClick={(event) => {
              if (dirty || busy) event.preventDefault();
            }}
          >
            <Download size={15} />
            Draft PDF
          </a>
          <button
            className="button small secondary"
            disabled={Boolean(busy) || !dirty}
            onClick={() => void save()}
          >
            <Save size={15} />
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>
          <button
            className="button small primary"
            disabled={Boolean(busy) || dirty || !hasUnpublished}
            onClick={() =>
              setConfirmation({
                title: "Publish this version?",
                body: "Your saved draft will become visible to visitors. The downloadable resume will use the same published content.",
                label: "Publish now",
                confirm: publish,
              })
            }
          >
            {busy === "publish" ? "Publishing…" : "Publish changes"}
          </button>
        </div>
      </div>
      {confirmation && (
        <ConfirmationDialog
          value={confirmation}
          close={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}
