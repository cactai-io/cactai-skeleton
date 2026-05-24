import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const PendingIndicator = ({ pending, theme: t, }) => {
    if (!pending)
        return null;
    return (_jsxs("div", { role: "status", "aria-label": "Processing", style: {
            display: 'flex',
            alignItems: 'center',
            gap: t.spacing.scale['1'],
            padding: `${t.spacing.scale['3']} 0`,
        }, children: [[0, 1, 2].map(i => (_jsx("span", { style: {
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    backgroundColor: t.color.text.disabled,
                    borderRadius: t.radii.full,
                    animation: `mui-dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                } }, i))), _jsx("style", { children: `
        @keyframes mui-dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      ` })] }));
};
//# sourceMappingURL=PendingIndicator.js.map