export const notFound = (req, res) => res.status(404).json({ error: 'Route not found.' });
export const errorHandler = (error, req, res, next) => {
  if (error?.name === 'MulterError') return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the upload limit.' : 'Upload failed.' });
  if (error?.name === 'ZodError') return res.status(400).json({ error: error.issues[0]?.message || 'Invalid input.' });
  if (error?.code === 'P2002') return res.status(409).json({ error: 'A record with this unique value already exists.' });
  const message = error?.message || 'Unexpected server error.';
  if (message.includes('Previous IP ID') || message.includes('not found')) return res.status(400).json({ error: message });
  console.error(error);
  return res.status(500).json({ error: 'Unable to complete that request safely.' });
};
