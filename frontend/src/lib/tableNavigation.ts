import React from "react";

export function handleTableCellKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  rowIdx: number,
  colIdx: number,
  onAppendRow?: () => void
) {
  const input = e.currentTarget;
  let targetRow = rowIdx;
  let targetCol = colIdx;
  let shouldNavigate = false;

  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    targetRow = colIdx === 10 ? rowIdx + 1 : rowIdx;
    targetCol = colIdx === 10 ? 0 : colIdx + 1;

    const focusNextCell = () => {
      const target = document.querySelector<HTMLInputElement>(
        `[data-row="${targetRow}"][data-col="${targetCol}"]`
      );
      if (!target) return false;
      target.focus();
      target.setSelectionRange(0, 0);
      return true;
    };

    if (!focusNextCell() && colIdx === 10 && onAppendRow) {
      onAppendRow();
      requestAnimationFrame(focusNextCell);
    }
    return;
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      targetRow = rowIdx + 1;
      shouldNavigate = true;
      break;
    case "ArrowUp":
      e.preventDefault();
      targetRow = rowIdx - 1;
      shouldNavigate = true;
      break;
    case "ArrowRight":
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        targetCol = colIdx + 1;
        shouldNavigate = true;
      }
      break;
    case "ArrowLeft":
      if (input.selectionStart === 0) {
        e.preventDefault();
        targetCol = colIdx - 1;
        shouldNavigate = true;
      }
      break;
  }

  if (shouldNavigate && (targetRow !== rowIdx || targetCol !== colIdx)) {
    const target = document.querySelector<HTMLInputElement>(
      `[data-row="${targetRow}"][data-col="${targetCol}"]`
    );
    if (target) {
      target.focus();
      if (target.type === "number") {
        target.select();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        target.setSelectionRange(0, 0);
      } else {
        target.setSelectionRange(target.value.length, target.value.length);
      }
    }
  }
}
