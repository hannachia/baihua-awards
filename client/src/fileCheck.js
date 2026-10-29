// Checks the chosen file BEFORE uploading, so people do not wait for an upload that will be refused.
export const MAX_MB = 150;
export const MAX_IMAGES = 9;
const NEEDS_FILE = ['singing', 'dance', 'calligraphy-painting'];

// Returns a translation key describing the problem, or null if the file is fine
export function fileProblem(file, category) {
  if (!file) return NEEDS_FILE.includes(category) ? 'reg.file.required' : null;
  if (file.size > MAX_MB * 1024 * 1024) return 'reg.file.big';
  const type = file.type;
  if (category === 'singing' || category === 'dance') return type === 'video/mp4' ? null : 'reg.file.type.video';
  if (category === 'calligraphy-painting') {
    return ['image/jpeg', 'image/png', 'application/pdf'].includes(type) ? null : 'reg.file.type.image';
  }
  return ['video/mp4', 'image/jpeg', 'image/png', 'application/pdf'].includes(type) ? null : 'reg.file.type.any';
}

export const acceptFor = (category) =>
  category === 'singing' || category === 'dance' ? 'video/mp4'
    : category === 'calligraphy-painting' ? 'image/jpeg,image/png,application/pdf'
      : 'video/mp4,image/jpeg,image/png,application/pdf';

// The same checks for a whole selection: one video or PDF, or up to 9 pictures (JPG or PNG)
export function filesProblem(files, category) {
  if (!files.length) return NEEDS_FILE.includes(category) ? 'reg.file.required' : null;
  if (files.some((f) => f.size > MAX_MB * 1024 * 1024)) return 'reg.file.big';
  if (category === 'singing' || category === 'dance') {
    return files.length === 1 && files[0].type === 'video/mp4' ? null : 'reg.file.type.video';
  }
  if (files.length > MAX_IMAGES) return 'reg.file.many';
  if (files.length > 1) return files.every((f) => ['image/jpeg', 'image/png'].includes(f.type)) ? null : 'reg.file.mix';
  return fileProblem(files[0], category);
}
