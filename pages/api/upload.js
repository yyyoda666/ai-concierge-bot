import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable Next.js default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Configure formidable for file parsing
    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        // Only allow images
        return mimetype && mimetype.includes('image');
      }
    });

    // Parse the form
    const [fields, files] = await form.parse(req);
    
    const uploadedFile = files.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = path.extname(uploadedFile.originalFilename || '');
    const newFilename = `upload_${timestamp}${fileExtension}`;
    const newPath = path.join(uploadsDir, newFilename);

    // Move file to final location
    fs.renameSync(uploadedFile.filepath, newPath);

    // Return file information
    const fileInfo = {
      filename: newFilename,
      originalName: uploadedFile.originalFilename,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      url: `/uploads/${newFilename}`,
      uploadedAt: new Date().toISOString()
    };

    console.log('File uploaded successfully:', fileInfo);

    res.status(200).json({
      success: true,
      file: fileInfo
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
} 