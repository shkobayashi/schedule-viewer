import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  BASELINE_MERGE_LLM_PROMPT,
  type BaselineMergeAssessment,
  headlineForDisplay,
} from "../model/baselineMerge";
import type {
  BaselineMergeReviewBlock,
  BaselineMergeReviewSection,
  BaselineMergeReviewView,
} from "../model/baselineMergeReview";
import { ModalDialog } from "./ModalDialog";

export type ExternalReloadDialogProps = {
  assessment: BaselineMergeAssessment;
  review: BaselineMergeReviewView | null;
  hasOpenEditDialog: boolean;
  diskUpdatedAgain: boolean;
  onReload: () => void;
  onKeepLocal: () => void;
  onApplyMerge: () => void;
};

function buildSummary(
  assessment: BaselineMergeAssessment,
  hasOpenEditDialog: boolean,
): string {
  const { counts } = assessment;
  if (assessment.kind === "sameOnly") {
    let text =
      "画面とファイルは同じ変更です。見えている内容は変わりません。読み直すと未保存が消え、取り消しは空になります。";
    if (hasOpenEditDialog) {
      text += "入力の途中は残しません。";
    }
    return text;
  }
  if (assessment.kind === "blocked") {
    const conflictCount = assessment.conflictLines.length;
    let text: string;
    if (conflictCount > 0) {
      text = `同じ箇所の変更が${conflictCount}件あります。この画面では一つにまとめません。Cursor または Claude のチャットで、baseline_diffs を読んでまとめるよう頼んでください。`;
      if (assessment.nonConflictCount > 0) {
        text += `ぶつかっていない変更は${assessment.nonConflictCount}件あります。頼んだチャットが、起点から書きます。`;
      }
    } else {
      text = "この画面では変更を画面へ反映できません。";
      if (assessment.validationMessage) {
        text += assessment.validationMessage;
      }
    }
    text += "読み直すと、画面の変更は失われます。";
    return text;
  }
  const parts: string[] = [];
  if (counts.screenOnly > 0) {
    parts.push(`画面の変更が${counts.screenOnly}件`);
  }
  if (counts.fileOnly > 0) {
    parts.push(`ファイルの変更が${counts.fileOnly}件`);
  }
  if (counts.same > 0) {
    parts.push(`同じ変更が${counts.same}件`);
  }
  let text = "画面とファイルは、別の箇所を変えています。";
  if (parts.length > 0) {
    text += parts.join("、") + "です。";
  }
  text += "ファイルはまだ書きません。";
  if (hasOpenEditDialog) {
    text += "入力の途中は残しません。";
  }
  return text;
}

function blockEnterActivation(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
  }
}

function scrollReviewList(
  element: HTMLDivElement,
  key: string,
  step: number,
): void {
  if (key === "ArrowDown") {
    element.scrollBy({ top: step, behavior: "auto" });
    return;
  }
  if (key === "ArrowUp") {
    element.scrollBy({ top: -step, behavior: "auto" });
    return;
  }
  if (key === "PageDown") {
    element.scrollBy({ top: element.clientHeight, behavior: "auto" });
    return;
  }
  if (key === "PageUp") {
    element.scrollBy({ top: -element.clientHeight, behavior: "auto" });
  }
}

function ReviewFieldLine({
  field,
}: {
  field: { label: string; visible: string; title: string };
}) {
  const text = field.label ? `${field.label}: ${field.visible}` : field.visible;
  return (
    <div className="external-reload-field" title={field.title}>
      {text}
    </div>
  );
}

function ReviewBlockItem({ block }: { block: BaselineMergeReviewBlock }) {
  const summaryClass = "external-reload-block-headline";

  if (block.kind === "headline" || block.kind === "title") {
    return (
      <li className="external-reload-block">
        <div className={summaryClass} title={block.accessibleHeadline}>
          {block.visibleHeadline}
        </div>
      </li>
    );
  }

  if (block.kind === "order") {
    return (
      <li className="external-reload-block">
        <div className={summaryClass} title={block.accessibleHeadline}>
          {block.visibleHeadline}
        </div>
        {block.preview ? (
          <div
            className="external-reload-order-preview"
            title={block.previewTitle}
          >
            {block.preview}
          </div>
        ) : null}
        {block.previewTitle ? (
          <details className="external-reload-details">
            <summary>並びの全文</summary>
            <div className="external-reload-field" title={block.previewTitle}>
              {block.previewTitle}
            </div>
          </details>
        ) : null}
      </li>
    );
  }

  if (block.kind === "add" || block.kind === "delete") {
    return (
      <li className="external-reload-block">
        {block.locationSubheading ? (
          <div
            className="external-reload-location"
            title={block.locationSubheading.title}
          >
            {block.locationSubheading.visible}
          </div>
        ) : null}
        <details className="external-reload-details">
          <summary className={summaryClass} title={block.accessibleHeadline}>
            {block.visibleHeadline}
          </summary>
          <div className="external-reload-detail-body">
            {block.detailLines.map((field) => (
              <ReviewFieldLine key={`${field.label}-${field.title}`} field={field} />
            ))}
          </div>
        </details>
      </li>
    );
  }

  if (block.kind !== "change") {
    return null;
  }

  return (
    <li className="external-reload-block">
      {block.locationSubheading ? (
        <div
          className="external-reload-location"
          title={block.locationSubheading.title}
        >
          {block.locationSubheading.visible}
        </div>
      ) : null}
      <div className={summaryClass} title={block.accessibleHeadline}>
        {block.visibleHeadline}
      </div>
      <div className="external-reload-detail-body">
        {block.fields.map((field) => (
          <ReviewFieldLine key={`${field.label}-${field.title}`} field={field} />
        ))}
      </div>
      {block.noteDetails ? (
        <details className="external-reload-details">
          <summary>ノート</summary>
          <div className="external-reload-detail-body">
            {block.noteDetails.map((field) => (
              <ReviewFieldLine key={`${field.label}-${field.title}`} field={field} />
            ))}
          </div>
        </details>
      ) : null}
    </li>
  );
}

function ReviewSection({ section }: { section: BaselineMergeReviewSection }) {
  const label = section.side === "screen" ? "画面" : "ファイル";
  return (
    <section className="external-reload-section" aria-labelledby={section.side}>
      <h3 className="external-reload-section-heading" id={section.side}>
        {label}、{section.count}件
      </h3>
      <ul className="external-reload-block-list">
        {section.blocks.map((block, index) => (
          <ReviewBlockItem
            key={`${section.side}-${index}-${block.accessibleHeadline}`}
            block={block}
          />
        ))}
      </ul>
    </section>
  );
}

export function ExternalReloadDialog({
  assessment,
  review,
  hasOpenEditDialog,
  diskUpdatedAgain,
  onReload,
  onKeepLocal,
  onApplyMerge,
}: ExternalReloadDialogProps) {
  const listId = useId();
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const reloadButtonRef = useRef<HTMLButtonElement>(null);
  const reviewListRef = useRef<HTMLDivElement>(null);
  const conflictListRef = useRef<HTMLDivElement>(null);
  const [copyFallbackOpen, setCopyFallbackOpen] = useState(false);
  const [copyAnnounced, setCopyAnnounced] = useState(false);
  const copyAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!diskUpdatedAgain) return;
    const list = reviewListRef.current ?? conflictListRef.current;
    if (list) list.scrollTop = 0;
  }, [diskUpdatedAgain, assessment]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(BASELINE_MERGE_LLM_PROMPT);
      setCopyAnnounced(true);
      window.setTimeout(() => setCopyAnnounced(false), 2000);
      return;
    } catch {
      setCopyFallbackOpen(true);
    }
  };

  const isSameOnly = assessment.kind === "sameOnly";
  const isBlocked = assessment.kind === "blocked";
  const isMergeable = assessment.kind === "mergeable";

  const initialFocusRef = isMergeable
    ? primaryActionRef
    : isBlocked
      ? reloadButtonRef
      : undefined;

  const handleReviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "PageDown" &&
      event.key !== "PageUp"
    ) {
      return;
    }
    event.preventDefault();
    scrollReviewList(event.currentTarget, event.key, 24);
  };

  return (
    <ModalDialog
      title="ファイルが更新されています"
      onClose={onKeepLocal}
      className="modal external-reload-dialog"
      initialFocusRef={initialFocusRef}
    >
      {diskUpdatedAgain ? (
        <p className="external-reload-notice" role="status">
          ファイルがもう一度更新されました
        </p>
      ) : null}
      <p>{buildSummary(assessment, hasOpenEditDialog)}</p>

      {isMergeable && review ? (
        <div
          id={listId}
          ref={reviewListRef}
          className="external-reload-review"
          tabIndex={0}
          role="region"
          aria-label="変更の一覧"
          onKeyDown={handleReviewKeyDown}
        >
          {review.screen ? <ReviewSection section={review.screen} /> : null}
          {review.file ? <ReviewSection section={review.file} /> : null}
          {review.same ? (
            <details className="external-reload-details external-reload-same">
              <summary>同じ変更 {review.same.count}件</summary>
              <ul className="external-reload-same-list">
                {review.same.headlines.map((headline, index) => (
                  <li
                    key={`same-${index}`}
                    title={review.same!.accessibleHeadlines[index]}
                  >
                    {headline}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {isBlocked && assessment.conflictLines.length > 0 ? (
        <div
          ref={conflictListRef}
          className="external-reload-review external-reload-conflicts-wrap"
          role="region"
          aria-label="変更の一覧"
          onKeyDown={handleReviewKeyDown}
          tabIndex={-1}
        >
          <ul className="external-reload-conflicts">
            {assessment.conflictLines.map((line) => (
              <li key={`${line.label}-${line.headline}`} title={line.headline}>
                {line.label} {headlineForDisplay(line.headline)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {copyFallbackOpen ? (
        <textarea
          ref={copyAreaRef}
          className="json-textarea external-reload-copy-fallback"
          readOnly
          value={BASELINE_MERGE_LLM_PROMPT}
          aria-label="依頼文"
        />
      ) : null}

      {copyAnnounced ? (
        <p className="external-reload-copy-status" role="status">
          コピーしました
        </p>
      ) : null}

      <div className="modal-actions">
        {isSameOnly ? (
          <>
            <button type="button" className="btn" onClick={onKeepLocal}>
              画面の編集を残す
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={onReload}
              onKeyDown={blockEnterActivation}
            >
              読み直す
            </button>
          </>
        ) : (
          <>
            <button
              ref={isBlocked ? reloadButtonRef : undefined}
              type="button"
              className="btn"
              onClick={onReload}
              onKeyDown={blockEnterActivation}
            >
              読み直す
            </button>
            <button type="button" className="btn" onClick={onKeepLocal}>
              画面の編集を残す
            </button>
            {isMergeable ? (
              <button
                ref={primaryActionRef}
                type="button"
                className="btn primary"
                onClick={onApplyMerge}
                onKeyDown={blockEnterActivation}
              >
                両方を画面へ反映
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => void copyPrompt()}>
                依頼文をコピー
              </button>
            )}
          </>
        )}
      </div>
    </ModalDialog>
  );
}
