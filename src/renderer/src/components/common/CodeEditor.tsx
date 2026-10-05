import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styles from './CodeEditor.module.css';

export type CodeLanguage = 'json' | 'xml' | 'text';

export interface CodeEditorHandle {
  openSearch(): void;
  focus(): void;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: CodeLanguage;
  readOnly?: boolean;
  wrap?: boolean;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

/** Syntax colours come from the design tokens (--syn-*). */
const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--syn-key)' },
  { tag: [tags.string, tags.attributeValue], color: 'var(--syn-string)' },
  { tag: tags.number, color: 'var(--syn-number)' },
  { tag: [tags.bool, tags.null, tags.keyword], color: 'var(--syn-keyword)' },
  { tag: [tags.tagName, tags.typeName], color: 'var(--syn-key)' },
  { tag: tags.attributeName, color: 'var(--syn-keyword)' },
  { tag: [tags.comment, tags.meta], color: 'var(--text-faint)', fontStyle: 'italic' },
  {
    tag: [tags.punctuation, tags.brace, tags.squareBracket, tags.separator, tags.angleBracket],
    color: 'var(--syn-punct)',
  },
]);

const theme = EditorView.theme({
  '&': { height: '100%', color: 'var(--text)', backgroundColor: 'transparent', fontSize: 'var(--fs-md)' },
  '&.cm-focused': { outline: 'none' },
  // Ligatures off: JetBrains Mono fuses "..." into one glyph and hides dots while typing.
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: 'var(--lh-code)',
    overflow: 'auto',
    fontVariantLigatures: 'none',
    fontFeatureSettings: '"liga" 0, "calt" 0',
  },
  '.cm-content': { padding: '10px 0', caretColor: 'var(--text)' },
  '.cm-line': { padding: '0 12px 0 2px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--text-faint)' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '40px', padding: '0', textAlign: 'right' },
  '.cm-foldGutter .cm-gutterElement': {
    width: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused .cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--surface-3) 45%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text-muted)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--accent-bg) !important',
  },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '.cm-matchingBracket': { backgroundColor: 'var(--surface-3)', outline: 'none' },
  '.cm-selectionMatch': { backgroundColor: 'var(--surface-3)' },
  '.cm-searchMatch': { backgroundColor: 'var(--warning-bg)', outline: '1px solid var(--warning)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--accent-bg)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--surface-3)',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '0 4px',
    borderRadius: '4px',
  },
  '.cm-placeholder': { color: 'var(--text-faint)' },
  '.cm-panels': { backgroundColor: 'var(--surface-2)', color: 'var(--text)', borderRadius: '8px 8px 0 0' },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '6px 8px', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontFamily: 'var(--font-ui)',
    fontSize: 'var(--fs-sm)',
    borderRadius: '4px',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '3px 6px',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--surface-3)',
    border: 'none',
    color: 'var(--text)',
    padding: '3px 8px',
  },
  '.cm-panel.cm-search label': { color: 'var(--text-muted)' },
  '.cm-panel.cm-search [name=close]': { color: 'var(--text-muted)', fontSize: '16px' },
});

function foldMarker(open: boolean): HTMLElement {
  const el = document.createElement('span');
  el.className = 'material-symbols-rounded';
  el.textContent = open ? 'expand_more' : 'chevron_right';
  el.style.fontSize = '14px';
  el.style.cursor = 'pointer';
  el.style.fontVariationSettings = "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20";
  return el;
}

function languageExt(lang: CodeLanguage): Extension {
  if (lang === 'json') return json();
  if (lang === 'xml') return xml();
  return [];
}

// Ctrl+Enter must reach the app (Send), so drop CodeMirror's Mod-Enter binding.
const baseKeymap = defaultKeymap.filter((k) => k.key !== 'Mod-Enter');

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, language, readOnly = false, wrap = false, placeholder, ariaLabel, className },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const langConf = useRef(new Compartment());
  const wrapConf = useRef(new Compartment());
  const roConf = useRef(new Compartment());

  useImperativeHandle(ref, () => ({
    openSearch: () => {
      const v = view.current;
      if (!v) return;
      v.focus();
      const cmd = searchKeymap.find((k) => k.key === 'Mod-f')?.run;
      cmd?.(v);
    },
    focus: () => view.current?.focus(),
  }));

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          foldGutter({ markerDOM: foldMarker }),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          drawSelection(),
          indentOnInput(),
          bracketMatching(),
          highlightSelectionMatches(),
          search({ top: true }),
          syntaxHighlighting(highlight),
          keymap.of([...baseKeymap, ...historyKeymap, ...foldKeymap, ...searchKeymap, indentWithTab]),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
          placeholder ? cmPlaceholder(placeholder) : [],
          langConf.current.of(languageExt(language)),
          wrapConf.current.of(wrap ? EditorView.lineWrapping : []),
          roConf.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The view is created once; props are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur !== value) v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: langConf.current.reconfigure(languageExt(language)) });
  }, [language]);

  useEffect(() => {
    view.current?.dispatch({ effects: wrapConf.current.reconfigure(wrap ? EditorView.lineWrapping : []) });
  }, [wrap]);

  useEffect(() => {
    view.current?.dispatch({
      effects: roConf.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
    });
  }, [readOnly]);

  return <div ref={host} className={`${styles.editor} ${className ?? ''}`} />;
});
