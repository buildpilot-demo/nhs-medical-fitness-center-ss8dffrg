import { useCallback, useEffect, useMemo, useRef } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { siteConfig } from "../site.config";
import { convexUrl, siteId } from "../lib/convex";
import { EnquiryForm } from "./EnquiryForm";

// Submission goes to the shared, multi-tenant Convex backend (see
// convex/README.md); the function lives in that deployment, so it is
// referenced by path rather than through generated API types.
const submitInquiryRef = makeFunctionReference<"mutation">("siteSubmissions:submitInquiry");

// Shared across both the cinematic and plain site variants (see
// src/types/site-config.ts) — enquirySection, businessName, and contact all
// live on the common base of SiteConfig, so this needs no variant branch.
export function EnquirySection() {
  const { enquirySection, businessName, contact } = siteConfig;
  const sectionRef = useRef<HTMLDivElement>(null);
  const convexClient = useMemo(() => (convexUrl ? new ConvexHttpClient(convexUrl) : null), []);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      element?.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) element.classList.add("is-visible"); },
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = useCallback(
    async (values: { name: string; email: string; phone: string; enquiryType: string; message: string }) => {
      // Without tenant wiring there is nowhere honest to send this, so the
      // form reports the configured disconnected message instead of
      // pretending the enquiry was delivered.
      if (!convexClient || !siteId) throw new Error(enquirySection.disconnectedMessage);
      try {
        await convexClient.mutation(submitInquiryRef, {
          siteId,
          name: values.name,
          email: values.email,
          phone: values.phone,
          enquiryType: values.enquiryType,
          message: values.message,
        });
      } catch {
        throw new Error(enquirySection.disconnectedMessage);
      }
    },
    [convexClient, enquirySection.disconnectedMessage],
  );

  return (
    <section
      id={enquirySection.id}
      ref={sectionRef}
      className="enquiry-section"
      aria-labelledby="enquiry-heading"
    >
      <div className="enquiry-grid">
        <div className="enquiry-intro">
          <p className="eyebrow">{enquirySection.eyebrow}</p>
          <h2 id="enquiry-heading">{enquirySection.heading}</h2>
          <p className="muted">{enquirySection.body}</p>
          <dl className="enquiry-details">
            {contact.address && (
              <div>
                <dt>Visit</dt>
                <dd>{contact.address}</dd>
              </div>
            )}
            {contact.hours && (
              <div>
                <dt>Opening hours</dt>
                <dd>{contact.hours}</dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt>Email</dt>
                <dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd>
              </div>
            )}
            {contact.phone && (
              <div>
                <dt>Phone</dt>
                <dd><a href={`tel:${contact.phone.replace(/\s+/g, "")}`}>{contact.phone}</a></dd>
              </div>
            )}
          </dl>
        </div>
        <div className="enquiry-form">
          <EnquiryForm onSubmit={handleSubmit} />
        </div>
      </div>
      <footer className="site-footer">
        <div className="site-footer__grid">
          <div><strong>{businessName}</strong></div>
          <div>
            {contact.address && <p className="muted">{contact.address}</p>}
            {contact.email && <p className="muted"><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
          </div>
        </div>
      </footer>
    </section>
  );
}
