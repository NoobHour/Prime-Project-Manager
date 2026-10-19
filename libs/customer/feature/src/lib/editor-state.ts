/** Every embedded editor exposes unsaved content separately from requests already in flight. */
export interface EditorState {
  readonly hasDraft: boolean;
  readonly busy: boolean;
  discardDraft(): void;
}

/** Accepts the mounted editors; returns whether any content or write needs protection. */
export function editorWork(editors: Array<Partial<EditorState> | undefined>) {
  return { dirty: editors.some((editor) => !!editor?.hasDraft), pending: editors.some((editor) => !!editor?.busy) };
}

/** Accepts one editor and a discard description; returns permission, never abandoning a pending write. */
export function mayReplace(editor: Pick<EditorState, 'hasDraft' | 'busy'>, description: string) {
  return !editor.busy && (!editor.hasDraft || confirm(description));
}
