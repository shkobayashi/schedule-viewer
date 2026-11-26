import { useCallback, useState } from "react";
import {
  dismissFirstRunHint,
  isFirstRunChecklistComplete,
  isFirstRunHintDismissed,
  isSaveHintCompleted,
  markFirstRunChecklistItem,
  markSaveHintCompleted,
  readFirstRunChecklist,
  type FirstRunChecklistId,
  type FirstRunChecklistState,
} from "../model/firstRunGuidance";

export function useDesktopFirstRunSession(): {
  dismissed: boolean;
  checklist: FirstRunChecklistState;
  saveHintCompleted: boolean;
  dismiss: () => void;
  markSaved: () => void;
  markStep: (id: FirstRunChecklistId) => void;
} {
  const [dismissed, setDismissed] = useState(isFirstRunHintDismissed);
  const [checklist, setChecklist] = useState(readFirstRunChecklist);
  const [saveHintCompleted, setSaveHintCompleted] = useState(isSaveHintCompleted);

  const dismiss = useCallback(() => {
    dismissFirstRunHint();
    setDismissed(true);
  }, []);

  const markSaved = useCallback(() => {
    markSaveHintCompleted();
    setSaveHintCompleted(true);
  }, []);

  const markStep = useCallback((id: FirstRunChecklistId) => {
    const next = markFirstRunChecklistItem(id);
    setChecklist(next);
    if (isFirstRunChecklistComplete(next) || isFirstRunHintDismissed()) {
      setDismissed(true);
    }
  }, []);

  return { dismissed, checklist, saveHintCompleted, dismiss, markSaved, markStep };
}
