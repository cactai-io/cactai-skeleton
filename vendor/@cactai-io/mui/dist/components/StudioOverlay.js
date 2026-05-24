import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Build a human-readable element path from a DOM element up to the overlay root.
function buildElementPath(el, root) {
    const parts = [];
    let current = el;
    while (current && current !== root) {
        const tag = current.tagName.toLowerCase();
        const id = current.id ? `#${current.id}` : '';
        const cls = current.classList.length > 0
            ? `.${Array.from(current.classList).slice(0, 2).join('.')}`
            : '';
        const idx = Array.from(current.parentElement?.children ?? []).indexOf(current);
        parts.unshift(`${tag}${id}${cls}[${idx}]`);
        current = current.parentElement;
    }
    return parts.join(' > ');
}
// Extract serialisable props from a DOM element.
function extractProps(el) {
    const props = {};
    const attrs = el.attributes;
    for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        // Skip event handlers and internal React attrs
        if (attr.name.startsWith('on') || attr.name.startsWith('data-react'))
            continue;
        props[attr.name] = attr.value;
    }
    if (el.textContent && el.children.length === 0) {
        props['textContent'] = el.textContent.slice(0, 120);
    }
    return props;
}
export function StudioOverlay({ skill_id, children, onInspect, active, 
// intentionally outside brand tokens — semantic role differs from theme accent.
accent_color = '#6366f1', }) {
    if (!active) {
        // Transparent passthrough — no overhead in user sessions
        return _jsx(_Fragment, { children: children });
    }
    const handleClick = (e) => {
        e.stopPropagation();
        const root = e.currentTarget;
        const target = e.target;
        if (target === root)
            return;
        const element_path = buildElementPath(target, root);
        const props = extractProps(target);
        // Highlight the selected element briefly
        const prev = target.style?.outline ?? '';
        target.style.outline = `2px solid ${accent_color}`;
        setTimeout(() => {
            target.style.outline = prev;
        }, 1200);
        onInspect({ skill_id, element_path, props });
    };
    return (_jsxs("div", { onClick: handleClick, "data-studio-overlay": skill_id, style: {
            position: 'relative',
            cursor: 'crosshair',
        }, children: [_jsx("div", { style: {
                    position: 'absolute',
                    inset: 0,
                    border: `1.5px dashed ${accent_color}`,
                    borderRadius: 4,
                    pointerEvents: 'none',
                    opacity: 0.5,
                    zIndex: 9998,
                } }), children] }));
}
//# sourceMappingURL=StudioOverlay.js.map