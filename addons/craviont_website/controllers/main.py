# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request


class CraviontWebsite(http.Controller):
    """Pages of the Craviont website. Enquiries use Odoo's own website form
    (website_crm, /website/form/crm.lead), so they arrive as CRM leads."""

    def _cv_values(self, page, **extra):
        values = request.website._craviont_layout_values(page)
        values.update(extra)
        return values

    @http.route('/craviont', type='http', auth='public', website=True, sitemap=False)
    def craviont_home(self, **kw):
        return request.render('craviont_website.page_home', self._cv_values('home'))

    @http.route('/about', type='http', auth='public', website=True, sitemap=True)
    def craviont_about(self, **kw):
        return request.render('craviont_website.page_about', self._cv_values('about'))

    @http.route('/services', type='http', auth='public', website=True, sitemap=True)
    def craviont_services(self, **kw):
        return request.render('craviont_website.page_services', self._cv_values('services'))

    @http.route('/contact', type='http', auth='public', website=True, sitemap=True)
    def craviont_contact(self, service='', **kw):
        return request.render('craviont_website.page_contact', self._cv_values(
            'contact', selected_service=(service or '')[:32],
            default_currency=request.website._craviont_default_currency(request.geoip.country_code)))

    @http.route('/contact/thank-you', type='http', auth='public', website=True, sitemap=False)
    def craviont_thanks(self, **kw):
        return request.render('craviont_website.page_thanks', self._cv_values('thanks'))

    @http.route('/privacy-policy', type='http', auth='public', website=True, sitemap=True)
    def craviont_privacy(self, **kw):
        return request.render('craviont_website.page_privacy', self._cv_values('privacy'))

    @http.route('/terms-conditions', type='http', auth='public', website=True, sitemap=True)
    def craviont_terms(self, **kw):
        return request.render('craviont_website.page_terms', self._cv_values('terms'))

    @http.route(['/contactus', '/about-us', '/aboutus'], type='http', auth='public', website=True,
                sitemap=False)
    def craviont_legacy(self, **kw):
        target = '/contact' if request.httprequest.path == '/contactus' else '/about'
        return request.redirect(target, code=301)
