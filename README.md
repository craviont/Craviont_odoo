# Craviont_odoo

Company website for Craviont Tech, built on Odoo 19 (Website + CRM) with one
custom addon, `craviont_website`. Same setup as the PNSB website.

```
addons/craviont_website/   the website module
docker/boot.py             boot manager: config, DB init, module sync, admin password, then exec odoo
Dockerfile                 FROM odoo:19.0; addons copied to /opt/craviont/addons
docker-compose.yml         local replica of the hosting setup
render.yaml                Render web service + PostgreSQL (craviont-db)
```

## The website

- Pages: Home (`/`, route `/craviont`), `/about`, `/services`, `/contact`,
  `/privacy-policy`, `/terms-conditions`, `/contact/thank-you`, plus a branded
  404 and branded header/footer on Odoo's own pages (login, portal).
- Enquiry forms are Odoo's own website forms (`website_crm`,
  `/website/form/crm.lead`): every submission becomes a **CRM lead**. Service,
  currency and budget are added to the lead's notes as "Other Information".
- Floating WhatsApp button (number in Website settings, field "WhatsApp Number").
- Logo, favicon and legal texts come from the `Craviont_Frontend` repository.
  The "AI Integration & Automation" service and the AI section are new copy for
  the AI-driven positioning and should be confirmed before going live.
- Design: neutral charcoal / warm white with Craviont green (#143109) as an
  accent only; Instrument Serif headlines, Instrument Sans text. One real-time
  3D object in the home hero, a modular cube whose layers turn around a green
  core (`static/src/three/craviont3d.js`, three.js r160 vendored in
  `static/lib/three`). Without WebGL the hero shows its text only.

## Local development

```bash
docker compose up --build
```

Site on http://localhost:10000, admin password `change-me-locally` (local only).
