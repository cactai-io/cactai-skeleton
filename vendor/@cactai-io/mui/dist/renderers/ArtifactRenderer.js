import { jsx as _jsx } from "react/jsx-runtime";
import { ArtifactCard } from '../components/ArtifactCard.js';
export const ArtifactRenderer = ({ artifact, theme, skillResult, onArtifactAction, }) => {
    // Determine rendering mode from Skill result
    const renderedComponent = skillResult?.success ? skillResult.component : undefined;
    const generatedCode = skillResult?.code;
    return (_jsx(ArtifactCard, { artifact: artifact, theme: theme, onArtifactAction: onArtifactAction, renderedComponent: renderedComponent, generatedCode: generatedCode }));
};
//# sourceMappingURL=ArtifactRenderer.js.map