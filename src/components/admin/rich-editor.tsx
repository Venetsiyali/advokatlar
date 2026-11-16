"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Matn tahrirlovchisi (Tiptap). Natija HTML yashirin <input name=...> orqali formaga qoʻshiladi;
 * serverda sanitize-html bilan tozalanadi.
 */
export function RichEditor({ name, initial, invalid, id }: { name: string; initial: string; invalid?: boolean; id?: string }) {
  const t = useTranslations("admin.editor");
  const [html, setHtml] = useState(initial);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"] },
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: "prose-content min-h-[320px] px-4 py-3 outline-none",
        ...(id && { id }),
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            paragraph: e.isActive("paragraph"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  const chain = () => editor!.chain().focus();
  const setLink = () => {
    const prev = (editor?.getAttributes("link").href as string | undefined) ?? "https://";
    const url = window.prompt(t("linkPrompt"), prev);
    if (url === null) return;
    if (!url.trim() || url === "https://") chain().extendMarkRange("link").unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const tools: { label: string; icon: React.ReactNode; on?: boolean; run: () => void; disabled?: boolean; sep?: boolean }[] = editor
    ? [
        { label: t("paragraph"), icon: <Pilcrow />, on: state?.paragraph, run: () => chain().setParagraph().run() },
        { label: t("h2"), icon: <Heading2 />, on: state?.h2, run: () => chain().toggleHeading({ level: 2 }).run() },
        { label: t("h3"), icon: <Heading3 />, on: state?.h3, run: () => chain().toggleHeading({ level: 3 }).run(), sep: true },
        { label: t("bold"), icon: <Bold />, on: state?.bold, run: () => chain().toggleBold().run() },
        { label: t("italic"), icon: <Italic />, on: state?.italic, run: () => chain().toggleItalic().run() },
        { label: t("underline"), icon: <Underline />, on: state?.underline, run: () => chain().toggleUnderline().run() },
        { label: t("strike"), icon: <Strikethrough />, on: state?.strike, run: () => chain().toggleStrike().run(), sep: true },
        { label: t("bulletList"), icon: <List />, on: state?.bullet, run: () => chain().toggleBulletList().run() },
        { label: t("orderedList"), icon: <ListOrdered />, on: state?.ordered, run: () => chain().toggleOrderedList().run() },
        { label: t("quote"), icon: <Quote />, on: state?.quote, run: () => chain().toggleBlockquote().run() },
        { label: t("hr"), icon: <Minus />, run: () => chain().setHorizontalRule().run(), sep: true },
        { label: t("link"), icon: <Link2 />, on: state?.link, run: setLink },
        { label: t("unlink"), icon: <Link2Off />, run: () => chain().extendMarkRange("link").unsetLink().run(), disabled: !state?.link, sep: true },
        { label: t("undo"), icon: <Undo2 />, run: () => chain().undo().run(), disabled: !state?.canUndo },
        { label: t("redo"), icon: <Redo2 />, run: () => chain().redo().run(), disabled: !state?.canRedo },
      ]
    : [];

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-white", invalid ? "border-red-400" : "border-navy-100", "focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-navy-100 bg-navy-50/50 p-1.5" role="toolbar">
        {tools.map((tool) => (
          <span key={tool.label} className="flex items-center">
            <button
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={tool.on}
              disabled={tool.disabled}
              onClick={tool.run}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-navy-700 transition hover:bg-white disabled:opacity-30 [&_svg]:size-4",
                tool.on && "bg-white text-brand-700 shadow-sm",
              )}
            >
              {tool.icon}
            </button>
            {tool.sep && <span className="mx-1 h-5 w-px bg-navy-100" />}
          </span>
        ))}
      </div>
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-[320px]" />}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
