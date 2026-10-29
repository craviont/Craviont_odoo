/**
 * Craviont website - early boot (loaded with `defer`, outside Odoo's bundles).
 *
 * Odoo loads the main frontend bundle only after `window.load`, i.e. once
 * every image and font has arrived. Scroll reveals and heading splits
 * therefore run here, as soon as the DOM is parsed, so content is never left
 * hidden. It only acts under html.cv-motion, which the layout never sets in
 * edit mode; if the editor is opened later, CSS shows everything.
 */
(function () {
    "use strict";
    var html = document.documentElement;
    if (!html.classList.contains("cv-motion") || !window.IntersectionObserver) {
        return;
    }
    var root = document.querySelector(".cv-root:not(.cv-root--chrome)");
    if (!root) {
        return;
    }

    // Masked word reveal for headings: <span.cv-sw><span.cv-sw__in>word</span></span>
    function splitWords(el) {
        var index = 0;
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.trim()) {
                nodes.push(walker.currentNode);
            }
        }
        nodes.forEach(function (node) {
            var fragment = document.createDocumentFragment();
            node.nodeValue.split(/(\s+)/).forEach(function (part) {
                if (!part) {
                    return;
                }
                if (/^\s+$/.test(part)) {
                    fragment.appendChild(document.createTextNode(part));
                    return;
                }
                var outer = document.createElement("span");
                outer.className = "cv-sw";
                var inner = document.createElement("span");
                inner.className = "cv-sw__in";
                inner.style.setProperty("--i", index++);
                inner.textContent = part;
                outer.appendChild(inner);
                fragment.appendChild(outer);
            });
            node.parentNode.replaceChild(fragment, node);
        });
        el.classList.add("cv-splitw");
    }

    var splits = root.querySelectorAll("[data-cv-split]");
    Array.prototype.forEach.call(splits, splitWords);

    // Stagger siblings that enter together (grids, lists).
    var reveals = root.querySelectorAll(".cv-reveal");
    var groups = new Map();
    Array.prototype.forEach.call(reveals, function (el) {
        var list = groups.get(el.parentElement) || [];
        list.push(el);
        groups.set(el.parentElement, list);
    });
    groups.forEach(function (list) {
        list.forEach(function (el, i) {
            el.style.setProperty("--cv-delay", Math.min(i, 6) * 70 + "ms");
        });
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }
            var el = entry.target;
            el.classList.add(el.hasAttribute("data-cv-split") ? "cv-splitw--in" : "cv-shown");
            observer.unobserve(el);
        });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    Array.prototype.forEach.call(reveals, function (el) { observer.observe(el); });
    Array.prototype.forEach.call(splits, function (el) { observer.observe(el); });
    html.classList.add("cv-booted");

    // Content above the fold animates in right away instead of waiting for the
    // first observer callback (which a background tab may not deliver yet).
    setTimeout(function () {
        var vh = window.innerHeight || 800;
        Array.prototype.forEach.call(splits, function (el) {
            if (el.getBoundingClientRect().top < vh) {
                el.classList.add("cv-splitw--in");
            }
        });
        Array.prototype.forEach.call(reveals, function (el) {
            if (el.getBoundingClientRect().top < vh * 0.95) {
                el.classList.add("cv-shown");
            }
        });
    }, 60);
})();
