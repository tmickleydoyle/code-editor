import { useState, useEffect } from "react";

interface CursorPosition {
  row: number;
  column: number;
}

interface SelectionRange {
  start: CursorPosition;
  end: CursorPosition;
}

export function useEditorCursor(
  code: string,
  textareaRef: React.RefObject<HTMLTextAreaElement>,
) {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
    row: 0,
    column: 0,
  });
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    start: { row: 0, column: 0 },
    end: { row: 0, column: 0 },
  });
  const [prefix, setPrefix] = useState("");
  const [highlighted, setHighlighted] = useState("");
  const [suffix, setSuffix] = useState("");

  useEffect(() => {
    const updateCursorAndSelection = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const value = textarea.value;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;

      const beforeCursor = value.substring(0, selectionStart);
      const lines = beforeCursor.split("\n");
      const row = lines.length;
      const column = lines[lines.length - 1].length + 1;

      setCursorPosition({ row, column });

      if (selectionStart !== selectionEnd) {
        const beforeSelectionEnd = value.substring(0, selectionEnd);
        const endLines = beforeSelectionEnd.split("\n");
        const endRow = endLines.length;
        const endColumn = endLines[endLines.length - 1].length + 1;

        setSelectionRange({
          start: { row, column },
          end: { row: endRow, column: endColumn },
        });
      } else {
        setSelectionRange({
          start: { row, column },
          end: { row, column },
        });
      }

      setPrefix(value.slice(0, selectionStart));
      setHighlighted(value.slice(selectionStart, selectionEnd));
      setSuffix(value.slice(selectionEnd));
    };

    updateCursorAndSelection();

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("input", updateCursorAndSelection);
      textarea.addEventListener("select", updateCursorAndSelection);
      textarea.addEventListener("click", updateCursorAndSelection);
      textarea.addEventListener("keyup", updateCursorAndSelection);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("input", updateCursorAndSelection);
        textarea.removeEventListener("select", updateCursorAndSelection);
        textarea.removeEventListener("click", updateCursorAndSelection);
        textarea.removeEventListener("keyup", updateCursorAndSelection);
      }
    };
  }, [code, textareaRef]);

  return { cursorPosition, selectionRange, prefix, highlighted, suffix };
}
