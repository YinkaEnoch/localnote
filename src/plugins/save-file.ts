import { registerPlugin, WebPlugin } from '@capacitor/core';

export interface SaveFileOptions {
  /** Display name presented in the system "Save As" picker. */
  fileName: string;
  /** File body as a UTF-8 string. */
  data: string;
  /** MIME type for the file (defaults to application/octet-stream). */
  mimeType?: string;
}

export interface SaveFileResult {
  /** URI of the file at the location the user chose. */
  uri: string;
  /** Convenience duplicate of `uri` (a path-like string). */
  path: string;
}

export interface SaveFilePlugin {
  saveFile(options: SaveFileOptions): Promise<SaveFileResult>;
}

/**
 * Web fallback: triggers a normal browser download. On web there is no
 * system "Save As" picker we can invoke, so this downloads to the browser's
 * default downloads folder.
 */
export class SaveFileWeb extends WebPlugin implements SaveFilePlugin {
  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    const { fileName, data, mimeType = 'application/octet-stream' } = options;
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { uri: fileName, path: fileName };
  }
}

export const SaveFile = registerPlugin<SaveFilePlugin>('SaveFile', {
  web: () => Promise.resolve(new SaveFileWeb()),
});
