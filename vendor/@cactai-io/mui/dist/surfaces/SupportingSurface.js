import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const SupportingSurface = ({ signal, component: Component, theme: t, onClose, }) => {
    if (!Component)
        return null;
    return (_jsxs("div", { role: "complementary", "aria-label": signal.reason ?? 'Supporting content', style: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '45%',
            minWidth: '320px',
            maxWidth: '640px',
            backgroundColor: t.color.surface,
            borderLeft: `1px solid ${t.color.border}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: t.zIndex.overlay,
            boxShadow: t.shadows.lg,
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${t.spacing.scale['3']} ${t.spacing.scale['4']}`,
                    borderBottom: `1px solid ${t.color.border}`,
                }, children: [signal.reason && (_jsx("span", { style: {
                            fontSize: t.typography.fontSize.sm,
                            color: t.color.text.secondary,
                            fontWeight: t.typography.fontWeight.medium,
                        }, children: signal.reason })), _jsx("button", { onClick: onClose, "aria-label": "Close panel", style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: t.radii.sm,
                            color: t.color.text.secondary,
                            cursor: 'pointer',
                            fontSize: t.typography.fontSize.lg,
                            transition: t.transitions.fast,
                            marginLeft: 'auto',
                        }, children: "\u00D7" })] }), _jsx("div", { style: { flex: 1, overflow: 'auto', padding: t.spacing.scale['4'] }, children: _jsx(Component, { config: signal.surface_config, theme: t }) })] }));
};
//# sourceMappingURL=SupportingSurface.js.map