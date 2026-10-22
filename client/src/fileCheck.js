// Checks the chosen file BEFORE uploading, so people do not wait for an upload that will be refused.
export const MAX_MB = 150;
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
