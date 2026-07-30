"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, whatsappHref } from "@/lib/utils";
import type { FaqItem, SiteContact } from "@/types";
import { ChevronDown, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = "name" | "email" | "message";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  roomType: string;
  message: string;
};

function validateField(key: FieldKey, values: FormValues): string | null {
  if (key === "name") {
    if (!values.name.trim()) return "Please enter your name.";
    return null;
  }
  if (key === "email") {
    const email = values.email.trim();
    if (!email) return "Please enter your email.";
    if (!email.includes("@")) return "Email must include @.";
    if (!EMAIL_RE.test(email)) return "Please enter a valid email address.";
    return null;
  }
  if (!values.message.trim()) return "Please enter a message.";
  return null;
}

function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-600" aria-hidden>
      *
    </span>
  );
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-olive/10 border-y border-olive/10">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 rounded-soft px-2 py-5 text-left transition-colors hover:bg-sage/10"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              <span className="font-display text-lg font-medium text-ink">
                {item.question}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-sage-600 transition-transform duration-300 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-brand ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-8 text-sm leading-relaxed text-ink-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContactContent({
  contact,
  faqs,
}: {
  contact: SiteContact;
  faqs: FaqItem[];
}) {
  const searchParams = useSearchParams();
  const roomPref = searchParams.get("room") ?? "";
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>(
    {},
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});

  const defaultRoom = useMemo(() => {
    if (roomPref.includes("shared")) return "shared";
    if (roomPref.includes("personal") || roomPref.includes("bedroom"))
      return "personal";
    if (roomPref.includes("flat")) return "flat";
    return roomPref || "";
  }, [roomPref]);

  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    phone: "",
    roomType: defaultRoom,
    message: "",
  });

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (key === "name" || key === "email" || key === "message") {
      const field = key as FieldKey;
      if (touched[field]) {
        const err = validateField(field, next);
        setFieldErrors((fe) => ({
          ...fe,
          [field]: err ?? undefined,
        }));
      }
    }
  }

  function markTouched(key: FieldKey, latest?: string) {
    const snapshot =
      latest !== undefined ? { ...values, [key]: latest } : values;
    setTouched((t) => ({ ...t, [key]: true }));
    const err = validateField(key, snapshot);
    setFieldErrors((fe) => ({
      ...fe,
      [key]: err ?? undefined,
    }));
  }

  function validateAll(): boolean {
    const next: Partial<Record<FieldKey, string>> = {};
    (["name", "email", "message"] as FieldKey[]).forEach((key) => {
      const err = validateField(key, values);
      if (err) next[key] = err;
    });
    setFieldErrors(next);
    setTouched({ name: true, email: true, message: true });
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!validateAll()) return;

    setPending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          roomType: values.roomType,
          message: values.message.trim(),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Something went wrong");
      }
      setSent(true);
      setValues({
        name: "",
        email: "",
        phone: "",
        roomType: defaultRoom,
        message: "",
      });
      setTouched({});
      setFieldErrors({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  const inputClass = (key?: FieldKey) =>
    cn(
      "w-full rounded-soft border bg-cream-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-olive/30",
      key && fieldErrors[key]
        ? "border-red-500 focus:border-red-500"
        : "border-olive/10",
    );

  return (
    <div className="bg-paper pt-24 md:pt-28">
      <div className="container-page pb-16 md:pb-24">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            Contact
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-olive md:text-5xl">
            Call, message, or write
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted md:text-lg">
            Every enquiry goes to a person. We reply within one business day.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex h-12 items-center gap-2 rounded-soft bg-olive px-5 text-base font-medium text-cream-50 shadow-soft transition-colors hover:bg-olive-700"
          >
            <Phone className="h-4 w-4" />
            {contact.phoneDisplay}
          </a>
          <a
            href={whatsappHref(
              contact.whatsapp,
              "Hi Guestay, I'd like to ask about a stay.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-soft border border-olive/20 bg-white/70 px-5 text-base font-medium text-olive transition-colors hover:bg-white"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>

        <div className="mt-10 grid items-stretch gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card
            padding="lg"
            className="flex flex-col bg-white/75 lg:min-h-full"
          >
            {sent ? (
              <div className="flex flex-1 flex-col justify-center py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/lockup-thanks.png"
                  alt="Guestay"
                  width={974}
                  height={1024}
                  className="mb-6 h-auto w-[7.5rem] sm:w-36"
                  decoding="async"
                />
                <p className="font-display text-2xl font-semibold text-olive">
                  Thanks, we have your note
                </p>
                <p className="mt-3 max-w-md text-ink-muted">
                  Prefer a call? Reach us at{" "}
                  <a
                    href={`tel:${contact.phone}`}
                    className="font-medium text-olive underline-offset-2 hover:underline"
                  >
                    {contact.phoneDisplay}
                  </a>
                  .
                </p>
                <Button
                  className="mt-5 self-start"
                  variant="outline"
                  type="button"
                  onClick={() => setSent(false)}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="font-display text-xl font-semibold text-ink">
                    Write to us
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Tell us dates, group size, or anything you need clarified.
                  </p>
                </div>
                <form
                  onSubmit={onSubmit}
                  noValidate
                  className="flex flex-1 flex-col"
                >
                  <div className="space-y-3.5">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                          Name
                          <RequiredMark />
                        </span>
                        <input
                          name="name"
                          value={values.name}
                          onChange={(e) => setField("name", e.target.value)}
                          onBlur={(e) => markTouched("name", e.target.value)}
                          aria-required="true"
                          aria-invalid={Boolean(fieldErrors.name)}
                          aria-describedby={
                            fieldErrors.name ? "contact-name-error" : undefined
                          }
                          className={inputClass("name")}
                          placeholder="Your name"
                          autoComplete="name"
                        />
                        {fieldErrors.name && (
                          <p
                            id="contact-name-error"
                            className="mt-1.5 text-sm text-red-600"
                            role="alert"
                          >
                            {fieldErrors.name}
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                          Email
                          <RequiredMark />
                        </span>
                        <input
                          type="email"
                          name="email"
                          value={values.email}
                          onChange={(e) => setField("email", e.target.value)}
                          onBlur={(e) => markTouched("email", e.target.value)}
                          aria-required="true"
                          aria-invalid={Boolean(fieldErrors.email)}
                          aria-describedby={
                            fieldErrors.email
                              ? "contact-email-error"
                              : undefined
                          }
                          className={inputClass("email")}
                          placeholder="you@email.com"
                          autoComplete="email"
                        />
                        {fieldErrors.email && (
                          <p
                            id="contact-email-error"
                            className="mt-1.5 text-sm text-red-600"
                            role="alert"
                          >
                            {fieldErrors.email}
                          </p>
                        )}
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                        Phone
                      </span>
                      <input
                        name="phone"
                        type="tel"
                        value={values.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        className={inputClass()}
                        placeholder="Optional"
                        autoComplete="tel"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                        Which room type
                      </span>
                      <select
                        name="roomType"
                        value={values.roomType}
                        onChange={(e) => setField("roomType", e.target.value)}
                        className={inputClass()}
                      >
                        <option value="">Not sure yet</option>
                        <option value="shared">Shared Rooms</option>
                        <option value="personal">Full Personal Room</option>
                        <option value="flat">Full 2-Bedroom Flats</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-soft">
                        Message
                        <RequiredMark />
                      </span>
                      <textarea
                        name="message"
                        rows={4}
                        value={values.message}
                        onChange={(e) => setField("message", e.target.value)}
                        onBlur={(e) => markTouched("message", e.target.value)}
                        aria-required="true"
                        aria-invalid={Boolean(fieldErrors.message)}
                        aria-describedby={
                          fieldErrors.message
                            ? "contact-message-error"
                            : undefined
                        }
                        className={cn(inputClass("message"), "resize-y")}
                        placeholder="Dates, group size, questions…"
                      />
                      {fieldErrors.message && (
                        <p
                          id="contact-message-error"
                          className="mt-1.5 text-sm text-red-600"
                          role="alert"
                        >
                          {fieldErrors.message}
                        </p>
                      )}
                    </label>
                    {error && (
                      <p className="text-sm text-red-700" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="pt-1">
                      <Button type="submit" size="lg" disabled={pending}>
                        {pending ? "Sending…" : "Send message"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-olive/10 pt-4">
                    <p className="text-sm leading-relaxed text-ink-muted">
                      Enquiries go to{" "}
                      <span className="font-medium text-ink">
                        {contact.email}
                      </span>
                      . We reply within one business day.
                    </p>
                  </div>
                </form>
              </>
            )}
          </Card>

          <div className="flex flex-col gap-6">
            <Card padding="lg" className="space-y-4 bg-white/75">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Visit</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {contact.addressLine1}
                    {contact.addressLine2 ? (
                      <>
                        <br />
                        {contact.addressLine2}
                      </>
                    ) : null}
                    <br />
                    {[contact.city, contact.region, contact.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="mt-2 text-xs text-ink-soft">{contact.hours}</p>
                  {contact.mapUrl ? (
                    <a
                      href={contact.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-olive underline-offset-2 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Call</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="mt-1 block text-sm text-ink-muted hover:text-olive"
                  >
                    {contact.phoneDisplay}
                  </a>
                  {contact.phoneSecondary && contact.phoneSecondaryDisplay ? (
                    <a
                      href={`tel:${contact.phoneSecondary}`}
                      className="mt-1 block text-sm text-ink-muted hover:text-olive"
                    >
                      {contact.phoneSecondaryDisplay}
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-sage-600" />
                <div>
                  <p className="font-medium text-ink">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="mt-1 block text-sm text-ink-muted hover:text-olive"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            </Card>

            <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-card border border-olive/10 bg-cream-100 lg:min-h-[280px]">
              {contact.mapEmbedUrl ? (
                <iframe
                  title="Guestay location map"
                  src={contact.mapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-40">
                    <div className="h-full w-full bg-[linear-gradient(to_right,#A6AC7E22_1px,transparent_1px),linear-gradient(to_bottom,#A6AC7E22_1px,transparent_1px)] bg-[size:28px_28px]" />
                  </div>
                  <div className="relative flex h-full min-h-[240px] items-center justify-center px-6 text-center lg:min-h-[280px]">
                    <div>
                      <MapPin className="mx-auto h-8 w-8 text-olive" />
                      <p className="mt-3 font-display text-lg font-medium text-olive">
                        {contact.city}, {contact.region}
                      </p>
                      <p className="mt-2 text-sm text-ink-muted">
                        {contact.mapEmbedNote}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-20 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-sage-600">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ink">
            Common questions
          </h2>
          <div className="mt-8">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </div>
  );
}
