const TITLE_REGEX = /^[a-zA-Z\s\-',.!?()&]+$/;

export function validateTitle(v: string): string | null {
  if (!v.trim()) return null; 
  if (!TITLE_REGEX.test(v)) return "Title may only contain letters and punctuation — no numbers or special characters.";
  return null;
}

export interface ImageFile {
  file: File;
  url: string;
  id: string;
}
