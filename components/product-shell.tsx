import type { FormEventHandler } from "react";
import { productConfig } from "@/lib/product/config";

type AuditHeroProps = {
  brandName: string;
  url: string;
  maxPages: number;
  submitting: boolean;
  onBrandNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onMaxPagesChange: (value: number) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function ProductHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${productConfig.name} home`}>
        <span className="brand-mark">{productConfig.mark}</span>
        <span>{productConfig.name}</span>
      </a>
      <nav className="header-links" aria-label="Project links">
        <a href={productConfig.repositoryUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        <div className="powered"><span className="status-dot" /> Powered by Antfly</div>
      </nav>
    </header>
  );
}

export function AuditHero({ brandName, url, maxPages, submitting, onBrandNameChange, onUrlChange, onMaxPagesChange, onSubmit }: AuditHeroProps) {
  return (
    <section className="hero" id="top">
      <div>
        <p className="eyebrow">{productConfig.eyebrow}</p>
        <h1>{productConfig.headline}</h1>
        <p className="hero-copy">{productConfig.description}</p>
        <div className="hero-actions">
          <a className="primary-link" href={productConfig.vercelDeployUrl} target="_blank" rel="noreferrer">Deploy on Vercel ↗</a>
          <a href={`${productConfig.repositoryUrl}/blob/main/docs/SELF_HOSTING.md`} target="_blank" rel="noreferrer">Self-hosting guide ↗</a>
        </div>
        <p className="open-source-note">Open source · Rebrandable · Antfly Lite or Antfly Cloud</p>
      </div>
      <form className="audit-card" onSubmit={onSubmit}>
        <div className="card-kicker">Run an Antfly-backed site audit</div>
        <label>Company name<input value={brandName} onChange={(event) => onBrandNameChange(event.target.value)} placeholder="Acme" required minLength={2} /></label>
        <label>Website<input value={url} onChange={(event) => onUrlChange(event.target.value)} placeholder="https://example.com" type="url" required /></label>
        <label>Maximum pages<select value={maxPages} onChange={(event) => onMaxPagesChange(Number(event.target.value))}><option value={5}>5 pages</option><option value={10}>10 pages</option><option value={25}>25 pages</option></select></label>
        <button type="submit" disabled={submitting}>{submitting ? "Discovering and auditing…" : "Audit site"}<span>→</span></button>
        <small>Discovers the sitemap and same-domain pages, respects robots rules, and stores every successful audit in Antfly.</small>
      </form>
    </section>
  );
}

export function ProductArchitecture() {
  return (
    <section className="architecture">
      <p className="eyebrow">Self-hostable reference architecture</p>
      <h2>One product, two Antfly modes.</h2>
      <p className="architecture-copy">Run the same application on Vercel or in Docker, backed by Antfly Lite locally or Antfly Cloud in production.</p>
      <div className="architecture-flow"><span>Next.js on Vercel <i>or</i> Docker</span><b>→</b><span>Server-only Antfly adapter</span><b>→</b><span>Local Lite <i>or</i> Cloud Lite</span></div>
    </section>
  );
}

export function ProductFooter() {
  return (
    <footer>
      <span>{productConfig.name} Community · {productConfig.licenseName}</span>
      <span>Open-source AEO/GEO powered by Antfly</span>
    </footer>
  );
}
