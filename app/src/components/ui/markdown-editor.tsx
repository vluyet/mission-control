"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { OverType as OverTypeInstance, Theme } from "overtype";

const EDITOR_FONT_FAMILY = 'var(--font-body), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const MISSION_CONTROL_EDITOR_THEME: Theme = {
  name: "mission-control",
  colors: {
    bgPrimary: "#ffffff",
    bgSecondary: "#f8fafc",
    border: "rgba(148, 163, 184, 0.16)",
    text: "#0f172a",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    placeholder: "#64748b",
    h1: "#0f172a",
    h2: "#1e293b",
    h3: "#334155",
    strong: "#0f172a",
    em: "#334155",
    link: "#3157c9",
    code: "#0f172a",
    codeBg: "rgba(148, 163, 184, 0.16)",
    blockquote: "#475569",
    hr: "rgba(100, 116, 139, 0.42)",
    listMarker: "#94a3b8",
    syntaxMarker: "rgba(100, 116, 139, 0.52)",
    selection: "rgba(49, 87, 201, 0.24)",
    cursor: "#3157c9",
    rawLine: "rgba(49, 87, 201, 0.08)"
  }
};

export type MarkdownEditorHandle = {
  focus: () => void;
  focusEnd: () => void;
  getValue: () => string;
  insertText: (text: string) => void;
  setValue: (value: string) => void;
};

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string | null;
  disabled?: boolean;
  required?: boolean;
  autoResize?: boolean;
  spellCheck?: boolean;
  className?: string;
  testId?: string;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}>(function MarkdownEditor(
  {
    name,
    value,
    defaultValue,
    placeholder,
    minHeight = "160px",
    maxHeight = null,
    disabled = false,
    required = false,
    autoResize = true,
    spellCheck = true,
    className,
    testId,
    ariaLabel,
    onChange
  },
  ref
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<OverTypeInstance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      if (!mountRef.current || instanceRef.current) {
        return;
      }

      const { default: OverType } = await import("overtype");

      if (cancelled || !mountRef.current) {
        return;
      }

      const [instance] = OverType.init(mountRef.current, {
        autoResize,
        fontFamily: EDITOR_FONT_FAMILY,
        fontSize: "15px",
        lineHeight: 1.75,
        maxHeight,
        minHeight,
        onChange: (nextValue) => {
          onChangeRef.current?.(nextValue);
        },
        padding: "0.92rem 1rem",
        placeholder,
        spellcheck: spellCheck,
        theme: MISSION_CONTROL_EDITOR_THEME,
        toolbar: false,
        value: value ?? defaultValue ?? "",
        textareaProps: {
          ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
          ...(name ? { name } : {}),
          ...(disabled ? { disabled: true } : {}),
          ...(required ? { required: true } : {})
        }
      });

      instance.showNormalEditMode();
      instance.textarea.style.setProperty("font-family", EDITOR_FONT_FAMILY, "important");
      instance.preview.style.setProperty("font-family", EDITOR_FONT_FAMILY, "important");
      instance.wrapper.querySelector<HTMLElement>(".overtype-placeholder")?.style.setProperty("font-family", EDITOR_FONT_FAMILY, "important");
      instance.container.classList.add("mission-markdown-container");
      instance.wrapper.classList.add("mission-markdown-wrapper");
      instance.preview.classList.add("mission-markdown-preview");
      instance.textarea.classList.add("mission-markdown-input");
      instanceRef.current = instance;
    }

    initialize();

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = instanceRef.current;

    if (!instance || value === undefined || value === instance.getValue()) {
      return;
    }

    instance.setValue(value);
  }, [value]);

  useEffect(() => {
    const textarea = instanceRef.current?.textarea;

    if (!textarea) {
      return;
    }

    if (name) {
      textarea.name = name;
    } else {
      textarea.removeAttribute("name");
    }

    textarea.disabled = disabled;
    textarea.required = required;
    textarea.placeholder = placeholder ?? "";
    textarea.spellcheck = spellCheck;

    if (ariaLabel) {
      textarea.setAttribute("aria-label", ariaLabel);
    } else {
      textarea.removeAttribute("aria-label");
    }
  }, [ariaLabel, disabled, name, placeholder, required, spellCheck]);

  useImperativeHandle(ref, () => ({
    focus() {
      instanceRef.current?.focus();
    },
    focusEnd() {
      const textarea = instanceRef.current?.textarea;

      instanceRef.current?.focus();
      if (!textarea) {
        return;
      }

      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    },
    getValue() {
      return instanceRef.current?.getValue() ?? "";
    },
    insertText(text: string) {
      instanceRef.current?.insertAtCursor(text);
    },
    setValue(nextValue: string) {
      instanceRef.current?.setValue(nextValue);
    }
  }), []);

  return (
    <div className={["markdown-editor-shell", disabled ? "markdown-editor-shell-disabled" : "", className].filter(Boolean).join(" ")} data-testid={testId}>
      <div ref={mountRef} />
    </div>
  );
});