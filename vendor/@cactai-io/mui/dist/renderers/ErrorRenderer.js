import { jsx as _jsx } from "react/jsx-runtime";
import { ErrorDisplay } from '../components/ErrorDisplay.js';
export const ErrorRenderer = ({ error, theme, onRetry, onDismiss, }) => {
    return (_jsx(ErrorDisplay, { error: error, theme: theme, onRetry: onRetry, onDismiss: onDismiss }));
};
//# sourceMappingURL=ErrorRenderer.js.map