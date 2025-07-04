import { put } from '@vercel/blob';
import formidable from 'formidable';
import fs from 'fs';

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
    // Configure formidable for file parsing
    const form = formidable({
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

    // Read the file data
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    
    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = uploadedFile.originalFilename ? 
      uploadedFile.originalFilename.split('.').pop() : 'jpg';
    const newFilename = `upload_${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(newFilename, fileBuffer, {
      access: 'public',
      contentType: uploadedFile.mimetype || 'image/jpeg'
    });

    // Clean up temporary file
    fs.unlinkSync(uploadedFile.filepath);

    // Return file information
    const fileInfo = {
      filename: newFilename,
      originalName: uploadedFile.originalFilename,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      url: blob.url, // This is the public URL from Vercel Blob
      uploadedAt: new Date().toISOString()
    };

    console.log('File uploaded successfully to Vercel Blob:', fileInfo);

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