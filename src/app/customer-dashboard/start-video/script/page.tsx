import { ScriptPage } from "@/components/script/ScriptPage";
import {
  clientNewScriptVersions,
  clientNewVideoScriptProject,
} from "@/data/prototype-scenarios";

export default function ClientStartVideoScriptRoute() {
  return (
    <ScriptPage
      project={clientNewVideoScriptProject}
      initialSubtab="script"
      initialTranscriptClipId={null}
      initialVersions={clientNewScriptVersions}
      initiallyEmpty
    />
  );
}
