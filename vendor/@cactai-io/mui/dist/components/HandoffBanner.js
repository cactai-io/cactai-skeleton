import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const HandoffBanner = ({ signal, theme: t, onHandoffAck, }) => {
    // Only render if there's a reason to display
    if (!signal.reason)
        return null;
    return (_jsxs("div", { role: "status", "aria-live": "polite", style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${t.spacing.scale['2']} ${t.spacing.scale['4']}`,
            backgroundColor: `${t.color.primary}11`,
            borderBottom: `1px solid ${t.color.primary}33`,
            fontSize: t.typography.fontSize.sm,
            color: t.color.text.secondary,
        }, children: [_jsx("span", { children: signal.reason }), _jsx("button", { onClick: () => onHandoffAck(signal), "aria-label": "Acknowledge", style: {
                    padding: `${t.spacing.scale['1']} ${t.spacing.scale['3']}`,
                    backgroundColor: 'transparent',
                    border: `1px solid ${t.color.primary}44`,
                    borderRadius: t.radii.sm,
                    color: t.color.primary,
                    fontSize: t.typography.fontSize.xs,
                    fontFamily: t.typography.fontFamily.base,
                    cursor: 'pointer',
                    transition: t.transitions.fast,
                }, children: "OK" })] }));
};
//# sourceMappingURL=HandoffBanner.js.map