# -*- coding: utf-8 -*-
import base64
import hashlib
import json
import re
from urllib.parse import quote

from markupsafe import Markup

from odoo import api, fields, models
from odoo.tools.misc import file_open

DEFAULT_COMPANY_NAMES = {'My Company', 'YourCompany', 'Your Company', 'My Company (San Francisco)'}
DEFAULT_WEBSITE_NAMES = {'My Website', 'Website', 'website'}
COMPANY_NAME = 'Craviont Tech'
COMPANY_EMAIL = 'cravionttech@gmail.com'
COMPANY_WEBSITE = 'https://www.craviont.com'
WHATSAPP = '+91 88490 91135'
WHATSAPP_TEXT = "Hi Craviont, I'd like to discuss a project."
# Official logo files from the Craviont_Frontend repository.
LOGO_PATH = 'craviont_website/static/src/img/craviont-logo-black.png'
FAVICON_PATH = 'craviont_website/static/src/img/favicon.png'
SCRIPT_BOOT_PATH = 'craviont_website/static/src/boot/boot.js'
_STATIC_URLS = {}

SOCIAL_LINKS = [
    ('linkedin', 'LinkedIn', 'https://www.linkedin.com/company/craviont/'),
    ('github', 'GitHub', 'https://github.com/craviont'),
    ('x', 'X', 'https://x.com/cravionttech'),
]

# Services and their lists come from craviont.com (2026-10). "AI Integration &
# Automation" is new, written for the AI-driven positioning: confirm before
# going live.
SERVICES = [
    {
        'key': 'ai',
        'title': 'AI Integration & Automation',
        'summary': 'Language models, assistants and automation built into your product and your '
                   'operations, tested and monitored like any other part of your software.',
        'items': ['AI features for web & mobile apps', 'Assistants & support chatbots',
                  'Search & answers over your own documents', 'Workflow automation & AI agents',
                  'Data pipelines & analytics', 'Evaluation, guardrails & cost control'],
    },
    {
        'key': 'frontend',
        'title': 'UI / UX & Frontend Engineering',
        'summary': 'We design and build clean, fast, and user-friendly interfaces that are easy to use '
                   'and easy to maintain.',
        'items': ['UI / UX Design (Web & App)', 'Design Systems & Component Libraries',
                  'Frontend Development (React, Next.js, Vue, etc.)', 'Responsive & Mobile-first Design',
                  'Performance Optimization', 'Accessibility & Usability Improvements'],
    },
    {
        'key': 'backend',
        'title': 'Backend & API Development',
        'summary': 'We build reliable backend systems and APIs that power secure, scalable digital '
                   'products.',
        'items': ['Backend Development (Node.js, Django, FastAPI, etc.)', 'REST & GraphQL API Development',
                  'Database Design & Optimization', 'Authentication & Authorization',
                  'Third-party API Integrations', 'System Architecture & Scalability Planning'],
    },
    {
        'key': 'fullstack',
        'title': 'Full-Stack Development',
        'summary': 'From idea to production, we handle the entire development lifecycle with clean '
                   'architecture and long-term reliability.',
        'items': ['End-to-End Application Development', 'Web Application Development',
                  'Mobile-ready Web Apps', 'SaaS Product Development', 'MVP Development',
                  'Legacy System Modernization'],
    },
    {
        'key': 'platform',
        'title': 'Platform, Integration & Support',
        'summary': 'We help teams integrate, improve, and maintain their systems so they continue '
                   'working as the business grows.',
        'items': ['API & System Integrations', 'Application Maintenance & Support',
                  'Performance & Code Audits', 'Deployment & Environment Setup',
                  'Monitoring & Stability Improvements', 'Technical Consulting & Code Reviews'],
    },
    {
        'key': 'security',
        'title': 'Cyber Security Services',
        'summary': 'We identify risks, harden your systems, and help you ship with confidence using '
                   'practical security testing and remediation support.',
        'items': ['Web app security testing', 'Mobile/iOS security testing', 'Vulnerability assessment',
                  'Penetration testing', 'Network security'],
    },
]

# "The Blueprint" from craviont.com, plus what the client receives at each step.
PROCESS = [
    ('01', 'Discovery', 'Deep dive into your business ecosystem and requirements.',
     'A clear scope, and a fixed-price or monthly quote.'),
    ('02', 'Strategy', 'Architecting the perfect solution and user journey map.',
     'Architecture and user journeys you approve before we build.'),
    ('03', 'Execution', 'Engineering excellence with clean, scalable code architecture.',
     'Working software to review at every milestone.'),
    ('04', 'Launch', 'Seamless deployment with continuous optimization and support.',
     'Deployment, monitoring and support that continues after go-live.'),
]

# FAQ from the Craviont_Frontend repository (Contact section).
FAQS = [
    ('Is there a free consultation?',
     'Yes. We start every engagement with a free discovery call to understand your goals and '
     'recommend the right approach.'),
    ('How quickly can we get started?',
     'Most projects kick off within 3 to 5 business days after we align on scope, timelines, and '
     'expectations.'),
    ('What industries do you work with?',
     'We partner with startups and growing businesses across SaaS, e-commerce, fintech, healthcare, '
     'and more.'),
    ('Do you offer ongoing support?',
     'Yes. We provide flexible support and maintenance options after launch to keep your product '
     'running smoothly.'),
    ('What is your pricing model?',
     "We offer both fixed-price project quotes and dedicated team monthly retainers depending on your "
     "project's needs."),
    ('Can you help with UI/UX only?',
     'Absolutely. We have a dedicated design team that can handle everything from user research to '
     'high-fidelity prototyping.'),
    ('Do you sign NDAs?',
     'Yes, we prioritize client confidentiality and are happy to sign standard non-disclosure '
     'agreements before project discussions.'),
    ('Which technologies do you specialize in?',
     'Our core stack includes React, Node.js, Python, and specialized cloud infrastructure on AWS and '
     'Google Cloud.'),
]

# Currencies offered in the budget field (code, symbol, name), from craviont.com.
CURRENCIES = [
    ('USD', '$', 'US Dollar'),
    ('INR', '₹', 'Indian Rupee'),
    ('EUR', '€', 'Euro'),
    ('GBP', '£', 'British Pound'),
    ('JPY', '¥', 'Japanese Yen'),
    ('AUD', 'A$', 'Australian Dollar'),
    ('CAD', 'C$', 'Canadian Dollar'),
    ('SGD', 'S$', 'Singapore Dollar'),
    ('AED', 'AED', 'UAE Dirham'),
]
EURO_COUNTRIES = {
    'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PT', 'SK', 'SI', 'ES',
}
COUNTRY_CURRENCIES = {'US': 'USD', 'IN': 'INR', 'GB': 'GBP', 'JP': 'JPY', 'AU': 'AUD', 'CA': 'CAD',
                      'SG': 'SGD', 'AE': 'AED'}

# Client words, shown in this order on the home page. Only real quotes.
TESTIMONIALS = [
    {
        'quote': 'They delivered our frontend, backend, UI/UX, and security with outstanding quality, '
                 'finishing early, under budget, and perfectly aligned with our brand. Highly recommended '
                 'as a reliable web development partner.',
        'author': 'Founder',
        'company': 'MM Contractor',
        'initials': 'MM',
    },
]

PAGE_DESCRIPTIONS = {
    'home': 'Craviont designs, builds and secures web, mobile and AI products for startups and '
            'growing businesses.',
    'about': 'Craviont is a digital technology company built around one belief: technology should '
             'solve real problems and scale with ambition.',
    'services': 'AI integration, UI/UX and frontend, backend and APIs, full-stack development, '
                'platform support and cyber security services.',
    'contact': "Let's make it happen. Tell Craviont about your project and book a free consultation.",
    'privacy': 'How Craviont collects, uses and protects the information you share with us.',
    'terms': 'The terms and conditions for using the Craviont website.',
}


class Website(models.Model):
    _inherit = 'website'

    craviont_email = fields.Char(
        string='Contact E-mail',
        help="E-mail address shown on the website. Defaults to the company e-mail when empty.")
    craviont_whatsapp = fields.Char(
        string='WhatsApp Number',
        help="Number used by the floating WhatsApp button, with country code "
             "(e.g. +91 88490 91135). Leave empty to hide the button.")
    craviont_whatsapp_link = fields.Char(compute='_compute_craviont_whatsapp_link')

    @api.depends('craviont_whatsapp')
    def _compute_craviont_whatsapp_link(self):
        for website in self:
            digits = re.sub(r'\D', '', website.craviont_whatsapp or '')
            website.craviont_whatsapp_link = (
                'https://wa.me/%s?text=%s' % (digits, quote(WHATSAPP_TEXT)) if len(digits) >= 8 else False)

    # ------------------------------------------------------------------
    # Values shared by every page of the public site
    # ------------------------------------------------------------------

    @api.model
    def _craviont_static_url(self, path):
        """URL of a static file with a content hash, so browsers never keep a
        stale copy after a deploy (used for scripts loaded outside Odoo's
        bundles: the early boot script)."""
        if path not in _STATIC_URLS:
            with file_open(path, 'rb') as fh:
                digest = hashlib.sha1(fh.read()).hexdigest()[:10]
            _STATIC_URLS[path] = '/%s?v=%s' % (path, digest)
        return _STATIC_URLS[path]

    @api.model
    def _craviont_boot_script_url(self):
        return self._craviont_static_url(SCRIPT_BOOT_PATH)

    @api.model
    def _craviont_default_currency(self, country_code):
        """Currency pre-selected in the budget field, from the visitor's country."""
        code = (country_code or '').upper()
        if code in EURO_COUNTRIES:
            return 'EUR'
        return COUNTRY_CURRENCIES.get(code, 'USD')

    def _craviont_layout_values(self, page):
        self.ensure_one()
        company = self.company_id.sudo()
        base_url = self.get_base_url()
        email = self.craviont_email or company.email or COMPANY_EMAIL
        organization = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': company.name,
            'url': base_url,
            'logo': base_url + '/' + LOGO_PATH,
            'email': email,
            'sameAs': [link[2] for link in SOCIAL_LINKS],
        }
        return {
            'cv_page': page,
            'cv_company': company,
            'cv_website': self,
            'cv_email': email,
            'cv_services': SERVICES,
            'cv_process': PROCESS,
            'cv_faqs': FAQS,
            'cv_currencies': CURRENCIES,
            'cv_testimonials': TESTIMONIALS,
            'cv_social': SOCIAL_LINKS,
            'cv_description': PAGE_DESCRIPTIONS.get(page, PAGE_DESCRIPTIONS['home']),
            'cv_jsonld': Markup(json.dumps(organization).replace('</', '<\\/')),
        }

    # ------------------------------------------------------------------
    # Install / upgrade setup
    # ------------------------------------------------------------------

    @api.model
    def _craviont_bootstrap(self):
        """Idempotent setup, safe to call on every install/upgrade.

        Names, e-mail, WhatsApp and social links are only filled while empty
        or still Odoo defaults, so backend edits are kept. Logo and favicon
        always follow the official files shipped in this module.
        """
        company = self.env.ref('base.main_company', raise_if_not_found=False)
        logo = self._craviont_read_image(LOGO_PATH)
        if company:
            vals = {}
            if company.name in DEFAULT_COMPANY_NAMES:
                vals['name'] = COMPANY_NAME
            if not company.email:
                vals['email'] = COMPANY_EMAIL
            if not company.website:
                vals['website'] = COMPANY_WEBSITE
            if company.logo != logo:
                vals['logo'] = logo
            if vals:
                company.write(vals)
        for website in self.search([]):
            vals = {}
            if not website.homepage_url or website.homepage_url == '/':
                vals['homepage_url'] = '/craviont'
            if website.name in DEFAULT_WEBSITE_NAMES:
                vals['name'] = COMPANY_NAME
            if not website.craviont_whatsapp:
                vals['craviont_whatsapp'] = WHATSAPP
            if website.logo != logo:
                vals['logo'] = logo
            vals['favicon'] = self._craviont_read_image(FAVICON_PATH)
            for key, _label, url in SOCIAL_LINKS:
                field = 'social_twitter' if key == 'x' else 'social_%s' % key
                if field in website._fields and not website[field]:
                    vals[field] = url
            website.write(vals)

    @api.model
    def _craviont_read_image(self, path):
        with file_open(path, 'rb') as fh:
            return base64.b64encode(fh.read())
