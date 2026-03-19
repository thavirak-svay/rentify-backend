export function sanitizeFileName(fileName: string): string {
  if (!fileName || fileName.trim() === '') {
    return `file_${Date.now()}`;
  }
  const baseName = fileName.split('/').pop()?.split('\\').pop() || `file_${Date.now()}`;
  const sanitized = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return sanitized || `file_${Date.now()}`;
}