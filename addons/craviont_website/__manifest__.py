# -*- coding: utf-8 -*-
{
    'name': "Craviont Website",
    'author': 'Craviont Tech',
    'category': 'Website/Website',
    'summary': "Company website for Craviont Tech: services, how we work, about, legal pages "
               "and website forms whose enquiries become CRM leads.",
    'website': 'https://www.craviont.com',
    'description': """
Craviont website
================
* Responsive company website: Home, About, Services, Contact, Privacy,
  Terms, thank-you page and a branded 404 page; a real-time 3D object
  (three.js) in the home hero.
* Enquiry forms are Odoo website forms (website_crm): every submission
  becomes a CRM lead.
* Floating WhatsApp button (Website settings: WhatsApp Number).
* Header and footer are also applied to Odoo's own website pages
  (login, portal).
""",
    'version': '19.0.2.0.0',
    'depends': ['website', 'crm', 'website_crm'],
    'data': [
        'views/website_layout.xml',
        'views/website_home.xml',
        'views/website_pages.xml',
        'views/website_contact.xml',
        'data/website_setup_data.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'craviont_website/static/src/scss/craviont.scss',
            'craviont_website/static/src/js/craviont.js',
        ],
    },
    'post_init_hook': 'post_init_hook',
    'images': ['static/description/icon.png'],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
