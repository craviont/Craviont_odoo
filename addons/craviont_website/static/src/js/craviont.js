import { Interaction } from "@web/public/interaction";
import { registry } from "@web/core/registry";
import { getScrollingElement, getScrollingTarget } from "@web/core/utils/scrolling";

const interactions = registry.category("public.interactions");

function motionAllowed() {
    return document.documentElement.classList.contains("cv-motion");
}

function clamp(v, min = 0, max = 1) {
    return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Site chrome: header state, mobile menu, back-to-top
// ---------------------------------------------------------------------------
export class CvChrome extends Interaction {
    static selector = ".cv-root";
    dynamicContent = {
        "[data-cv-menu-toggle]": {
            "t-on-click": this.toggleMenu,
            "t-att-aria-expanded": () => String(this.menuOpen),
        },
        "[data-cv-menu] a": { "t-on-click": this.closeMenu },
        "[data-cv-header]": { "t-att-class": () => ({ "is-scrolled": this.scrolled || this.isChrome }) },
        "[data-cv-totop]": {
            "t-on-click": this.scrollToTop,
            "t-att-class": () => ({ "is-visible": this.showTop }),
        },
        _document: { "t-on-keydown.noUpdate": this.onKeydown },
    };

    setup() {
        this.menuOpen = false;
        this.scrolled = false;
        this.showTop = false;
        this.isChrome = this.el.classList.contains("cv-root--chrome");
    }

    start() {
        this.scroller = getScrollingElement(document);
        const target = getScrollingTarget(this.scroller);
        this.addListener(target, "scroll.noUpdate", this.onScroll, { passive: true });
        this.onScroll();
    }

    destroy() {
        document.documentElement.classList.remove("cv-menu-open");
    }

    onScroll() {
        const y = this.scroller.scrollTop || window.scrollY || 0;
        const scrolled = y > 8;
        const showTop = y > 900;
        if (scrolled !== this.scrolled || showTop !== this.showTop) {
            this.scrolled = scrolled;
            this.showTop = showTop;
            this.updateContent();
        }
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
        document.documentElement.classList.toggle("cv-menu-open", this.menuOpen);
    }

    closeMenu() {
        this.menuOpen = false;
        document.documentElement.classList.remove("cv-menu-open");
    }

    onKeydown(ev) {
        if (ev.key === "Escape" && this.menuOpen) {
            this.closeMenu();
            this.updateContent();
        }
    }

    scrollToTop() {
        this.scroller.scrollTo({ top: 0, behavior: motionAllowed() ? "smooth" : "auto" });
    }
}
interactions.add("craviont_website.chrome", CvChrome);

// ---------------------------------------------------------------------------
// Services page: the sticky index highlights the service in view.
// ---------------------------------------------------------------------------
export class CvServices extends Interaction {
    static selector = "[data-cv-services]";
    dynamicContent = {
        "[data-cv-spy-link]": {
            "t-att-class": (el) => ({ "is-active": el.dataset.cvSpyLink === this.active }),
        },
    };

    setup() {
        this.active = this.el.querySelector("[data-cv-service]")?.dataset.cvService;
    }

    start() {
        this.observer = new IntersectionObserver((entries) => {
            const visible = entries.filter((e) => e.isIntersecting);
            if (visible.length) {
                this.active = visible[0].target.dataset.cvService;
                this.updateContent();
            }
        }, { rootMargin: "-45% 0px -50% 0px" });
        this.el.querySelectorAll("[data-cv-service]").forEach((el) => this.observer.observe(el));
        this.registerCleanup(() => this.observer.disconnect());
    }
}
interactions.add("craviont_website.services", CvServices);

// ---------------------------------------------------------------------------
// Statements: words darken as the text scrolls through the view.
// ---------------------------------------------------------------------------
export class CvWords extends Interaction {
    static selector = "[data-cv-words]";

    start() {
        if (!motionAllowed()) {
            return;
        }
        this.original = this.el.textContent;
        this.el.innerHTML = "";
        this.words = this.original.trim().split(/\s+/).map((word) => {
            const span = document.createElement("span");
            span.className = "cv-w";
            span.textContent = word;
            this.el.append(span, document.createTextNode(" "));
            return span;
        });
        this.registerCleanup(() => {
            this.el.textContent = this.original;
        });
        const scroller = getScrollingElement(document);
        this.addListener(getScrollingTarget(scroller), "scroll.noUpdate", this.onScroll, { passive: true });
        this.onScroll();
    }

    onScroll() {
        const rect = this.el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) {
            return;
        }
        const p = clamp((vh * 0.82 - rect.top) / (rect.height + vh * 0.3));
        const on = Math.round(p * this.words.length);
        this.words.forEach((w, i) => w.classList.toggle("is-on", i < on));
    }
}
interactions.add("craviont_website.words", CvWords);

// ---------------------------------------------------------------------------
// Enquiry forms (Odoo website form -> crm.lead): name the lead after the
// visitor, e.g. "Website enquiry: Demo Labs", instead of a generic title.
// ---------------------------------------------------------------------------
export class CvLeadName extends Interaction {
    static selector = "form[data-cv-lead]";
    dynamicContent = {
        "[name=contact_name], [name=partner_name]": { "t-on-input.noUpdate": this.rename },
    };

    rename() {
        const value = (name) => (this.el.querySelector(`[name=${name}]`)?.value || "").trim();
        const who = value("partner_name") || value("contact_name");
        this.el.querySelector("input[name=name]").value = who ? `Website enquiry: ${who}`.slice(0, 120) : "Website enquiry";
    }
}
interactions.add("craviont_website.lead_name", CvLeadName);

// ---------------------------------------------------------------------------
// Budget field: currency dropdown (listbox) in front of the amount. The
// hidden native select holds the value Odoo's website form sends.
// ---------------------------------------------------------------------------
export class CvCurrency extends Interaction {
    static selector = "[data-cv-currency]";
    dynamicContent = {
        "[data-cv-cur-toggle]": {
            "t-on-click": this.toggle,
            "t-on-keydown": this.onToggleKey,
            "t-att-aria-expanded": () => String(this.open),
        },
        "[data-cv-cur-menu]": { "t-att-class": () => ({ "is-open": this.open }) },
        "[data-cv-cur-opt]": {
            "t-on-click": (ev) => this.choose(ev.currentTarget),
            "t-on-keydown": this.onOptionKey,
            "t-att-aria-selected": (el) => String(el.dataset.value === this.value),
            "t-att-class": (el) => ({ "is-selected": el.dataset.value === this.value }),
        },
        "[data-cv-currency-symbol]": { "t-out": () => this.current.dataset.symbol },
        "[data-cv-currency-code]": { "t-out": () => this.current.dataset.code },
        _document: { "t-on-pointerdown": this.onOutside },
    };

    setup() {
        this.select = this.el.querySelector("select");
        this.toggleEl = this.el.querySelector("[data-cv-cur-toggle]");
        this.options = [...this.el.querySelectorAll("[data-cv-cur-opt]")];
        this.value = this.select.value;
        this.open = false;
    }

    get current() {
        return this.options.find((o) => o.dataset.value === this.value) || this.options[0];
    }

    toggle() {
        this.setOpen(!this.open);
    }

    setOpen(open, focus = true) {
        this.open = open;
        if (open && focus) {
            this.waitForAnimationFrame(() => this.current.focus());
        }
    }

    choose(option) {
        this.value = option.dataset.value;
        this.select.value = this.value;
        this.select.dispatchEvent(new Event("change", { bubbles: true }));
        this.open = false;
        this.toggleEl.focus();
    }

    onToggleKey(ev) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(ev.key)) {
            ev.preventDefault();
            this.setOpen(true);
        }
    }

    onOptionKey(ev) {
        const index = this.options.indexOf(ev.currentTarget);
        const move = { ArrowDown: 1, ArrowUp: -1 }[ev.key];
        if (move) {
            ev.preventDefault();
            this.options[(index + move + this.options.length) % this.options.length].focus();
        } else if (ev.key === "Home" || ev.key === "End") {
            ev.preventDefault();
            this.options[ev.key === "Home" ? 0 : this.options.length - 1].focus();
        } else if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.choose(ev.currentTarget);
        } else if (ev.key === "Escape" || ev.key === "Tab") {
            if (ev.key === "Escape") {
                ev.preventDefault();
                this.toggleEl.focus();
            }
            this.open = false;
        }
    }

    onOutside(ev) {
        if (this.open && !this.el.contains(ev.target)) {
            this.open = false;
        }
    }
}
interactions.add("craviont_website.currency", CvCurrency);
