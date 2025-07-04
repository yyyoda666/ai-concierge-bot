import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Relay.app webhook URL (from environment variable for security)
const RELAY_WEBHOOK_URL = process.env.RELAY_WEBHOOK_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { conversationHistory, conversationId } = req.body;
    
    // Validate required fields
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      console.error('Missing or invalid conversationHistory');
      return res.status(400).json({ 
        error: 'Missing conversationHistory',
        details: 'conversationHistory is required and must be an array' 
      });
    }
    
    if (!conversationId) {
      console.error('Missing conversationId');
      return res.status(400).json({ 
        error: 'Missing conversationId',
        details: 'conversationId is required' 
      });
    }

    // Extract any uploaded files from conversation and let AI categorize them
    const uploadedFiles = (conversationHistory || [])
      .filter(msg => msg.role === 'user' && (
        msg.content.includes('📎 Uploaded:') || // Old format
        msg.content.includes('📎') || // New format
        msg.content.includes('User uploaded') // Alternative format
      ))
      .map((msg, index) => {
        // Handle different file upload message formats
        let fileName = '';
        if (msg.content.includes('📎 Uploaded:')) {
          fileName = msg.content.replace('📎 Uploaded: ', '');
        } else if (msg.content.includes('📎')) {
          // New format: "📎 filename.ext some message"
          const match = msg.content.match(/📎\s*([^\s]+\.[a-zA-Z0-9]+)/);
          fileName = match ? match[1] : 'unknown-file';
        } else if (msg.content.includes('User uploaded')) {
          // Alternative format: "User uploaded a STYLE REFERENCE: filename.ext"
          const match = msg.content.match(/User uploaded.*?:\s*([^\s]+\.[a-zA-Z0-9]+)/);
          fileName = match ? match[1] : 'unknown-file';
        }
        
        // Find the actual file info from the same message (it should have both content and file)
        const fileInfo = msg.file;
        
        return {
          fileName,
          originalName: fileName,
          url: fileInfo?.url || null,
          size: fileInfo?.size,
          mimetype: fileInfo?.mimetype,
          uploadOrder: index + 1 // Track order for categorization
        };
      });

    // Enhanced AI prompt that includes file categorization
    const enhancedExtractionPrompt = `Analyze this conversation and extract information into this EXACT JSON structure.

IMPORTANT: The conversation includes ${uploadedFiles.length} uploaded files. Based on the conversation context, categorize each file as either:
- "product" (user's actual product they want photographed)
- "reference" (style inspiration/example they want to emulate)

Files uploaded in order: ${uploadedFiles.map((f, i) => `${i + 1}. ${f.originalName}`).join(', ')}

CRITICAL: You MUST return exactly this JSON structure with these exact field names. Never add, remove, or rename fields.

REQUIRED JSON STRUCTURE:
{
  "contactName": "string - person's name or 'Not provided'",
  "contactEmail": "string - email address or 'Not provided'", 
  "contactCompany": "string - company name or 'Not provided'",
  "contactTitle": "string - job title or 'Not provided'",
  "requestType": "meeting|proposal|test|unclear",
  "serviceCategory": "production|concepts|labs|unclear", 
  "projectBrief": "string - detailed description of what they want",
  "timeline": "string - when they need it or 'Not provided'",
  "budget": "string - budget mentioned or 'Not provided'",
  "inspiration": "string - style references, brand inspirations, or aesthetic direction mentioned or 'Not provided'",
  "technicalSpecs": "string - specific technical requirements, formats, dimensions, or delivery specs or 'Not provided'",
  "modelPreferences": "string - model types, poses, styling preferences for production work or 'Not provided'",
  "brandGuidelines": "string - existing brand style, guidelines, or aesthetic requirements or 'Not provided'",
  "deliverables": "string - specific outputs needed, quantities, formats, variations or 'Not provided'",
  "readinessLevel": "browsing|interested|ready|qualified",
  "engagementLevel": "low|medium|high",
  "primaryLanguage": "en|sv",
  "keyTopics": "string - comma-separated list of main topics discussed",
  "nextSteps": "string - what should happen next", 
  "missingInfo": "string - what information is still needed",
  "conversationSummary": "string - 2-3 sentence summary of the conversation",
  "fileCategories": [${uploadedFiles.map((f, i) => `{"uploadOrder": ${i + 1}, "fileName": "${f.originalName}", "type": "product|reference", "reasoning": "brief explanation"}`).join(', ')}]
}

FIELD DEFINITIONS:
- requestType: "meeting"=wants consultation, "proposal"=has specific project, "test"=wants samples, "unclear"=not sure
- serviceCategory: "production"=final assets, "concepts"=creative work, "labs"=AI exploration, "unclear"=not determined
- readinessLevel: "browsing"=just looking, "interested"=considering, "ready"=wants to proceed, "qualified"=serious prospect
- engagementLevel: "low"=casual interest, "medium"=asking questions, "high"=detailed discussion
- fileCategories: Categorize each uploaded file based on conversation context

Use "Not provided" for missing contact info. Use "Unclear" for classification fields when uncertain.
Be specific and detailed in projectBrief and conversationSummary.

Conversation to analyze:
${(conversationHistory || []).map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}`;

    console.log('Calling Anthropic for enhanced extraction with file categorization...');
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: enhancedExtractionPrompt }]
    });

    const aiExtraction = extractionResponse.content[0].text;
    console.log('AI extraction completed, length:', aiExtraction.length);

    // Parse the JSON response from AI
    let leadData;
    try {
      // Extract JSON from the AI response (in case it's wrapped in markdown)
      const jsonMatch = aiExtraction.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiExtraction;
      leadData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', parseError);
      console.error('Raw AI response:', aiExtraction);
      
      // Fallback to rigid structure for consistent Relay.app integration
      leadData = {
        contactName: "Not provided",
        contactEmail: "Not provided", 
        contactCompany: "Not provided",
        contactTitle: "Not provided",
        requestType: "unclear",
        serviceCategory: "unclear",
        projectBrief: "Conversation could not be properly analyzed",
        timeline: "Not provided",
        budget: "Not provided",
        inspiration: "Not provided",
        technicalSpecs: "Not provided",
        modelPreferences: "Not provided", 
        brandGuidelines: "Not provided",
        deliverables: "Not provided",
        readinessLevel: "unclear",
        engagementLevel: "low",
        primaryLanguage: "unclear",
        keyTopics: "Error in analysis",
        nextSteps: "Manual review needed",
        missingInfo: "Most information needs to be collected",
        conversationSummary: "Technical error occurred during conversation analysis"
      };
    }

    // Process AI's file categorization with flatter structure for Relay
    const categorizedUploadedFiles = uploadedFiles.map(file => {
      // Find corresponding categorization from AI
      const aiCategory = leadData.fileCategories?.find(cat => cat.fileName === file.originalName);
      
      return {
        fileName: file.fileName,
        originalName: file.originalName,
        type: aiCategory?.type || 'uncategorized',
        category: aiCategory?.type === 'product' ? 'Product Image' : aiCategory?.type === 'reference' ? 'Style Reference' : 'Uploaded File',
        url: file.url, // Keep original field name for compatibility
        fileUrl: file.url, // Also provide new field name for Relay
        size: file.size,
        fileSize: file.size, // Also provide new field name
        mimetype: file.mimetype,
        fileType: file.mimetype, // Also provide new field name
        reasoning: aiCategory?.reasoning || 'Not categorized by AI'
      };
    });

    // Separate for easier access in automation - with direct URL access
    const productImages = categorizedUploadedFiles.filter(f => f.type === 'product');
    const styleReferences = categorizedUploadedFiles.filter(f => f.type === 'reference');

    // Create simple URL arrays for easier Relay processing
    const productImageUrls = productImages.map(f => f.fileUrl).filter(Boolean);
    const styleReferenceUrls = styleReferences.map(f => f.fileUrl).filter(Boolean);

    // Remove fileCategories from leadData since we've processed it
    const { fileCategories, ...cleanLeadData } = leadData;

    // Create full conversation transcript and upload to Vercel Blob
    let chatTranscriptUrl = null;
    try {
      // Create comprehensive transcript with metadata
      const conversationTranscript = {
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        source: "AI Chat Widget",
        conversationLength: conversationHistory?.length || 0,
        extractedBrief: cleanLeadData,
        fullConversation: conversationHistory.map((msg, index) => ({
          messageNumber: index + 1,
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(), // Would be better with actual timestamps
          ...(msg.file && { attachedFile: msg.file })
        })),
        uploadedFiles: categorizedUploadedFiles,
        systemMetadata: {
          autoSubmit: req.body.autoSubmit || false,
          browserClose: req.body.browserClose || false,
          submissionTrigger: req.body.source || 'manual'
        }
      };

      // Generate filename with timestamp for easy sorting
      const transcriptFilename = `conversation-${conversationId}-${Date.now()}.json`;
      
      // Upload transcript to Vercel Blob
      const transcriptBlob = await put(transcriptFilename, JSON.stringify(conversationTranscript, null, 2), {
        access: 'public',
        contentType: 'application/json'
      });

      chatTranscriptUrl = transcriptBlob.url;
      console.log('Conversation transcript uploaded:', chatTranscriptUrl);

    } catch (transcriptError) {
      console.error('Failed to create conversation transcript:', transcriptError);
      // Don't fail the entire submission if transcript upload fails
    }

    // Add system metadata (consistent with rigid structure)
    const finalPayload = {
      ...cleanLeadData,
      // System metadata
      conversationId: conversationId,
      timestamp: new Date().toISOString(),
      source: "AI Chat Widget",
      conversationLength: conversationHistory?.length || 0,
      extractedAt: new Date().toISOString(),
      // NEW: Chat transcript URL for full conversation review
      chatTranscriptUrl: chatTranscriptUrl,
      // Enhanced file categorization
      uploadedFiles: categorizedUploadedFiles.length > 0 ? categorizedUploadedFiles : undefined,
      // Simplified URL arrays for Relay
      productImageUrls: productImageUrls.length > 0 ? productImageUrls : undefined,
      styleReferenceUrls: styleReferenceUrls.length > 0 ? styleReferenceUrls : undefined,
      // File counts for easier automation logic
      totalFiles: categorizedUploadedFiles.length,
      productImageCount: productImages.length,
      styleReferenceCount: styleReferences.length,
      autoSubmit: req.body.autoSubmit || false,
      // Reference for later file uploads
      emailReference: `Project REF: ${conversationId}`,
      fileUploadInstructions: categorizedUploadedFiles.length === 0 ? 
        `To send files later, email them to ${process.env.CONTACT_EMAIL || 'contact@example.com'} with subject: "Project REF: ${conversationId}". Please specify if sending PRODUCT IMAGES (your actual products) or STYLE REFERENCES (inspiration examples).` : 
        undefined
    };

    // Send to Relay.app webhook
    const webhookResponse = await fetch(RELAY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook failed:', webhookResponse.status, webhookResponse.statusText);
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Brief submitted successfully',
      leadData: finalPayload,
      chatTranscriptUrl: chatTranscriptUrl, // Include transcript URL in response
      quickAnalysis: {
        requestType: cleanLeadData.requestType,
        readinessLevel: cleanLeadData.readinessLevel,
        nextSteps: cleanLeadData.nextSteps
      }
    });

  } catch (error) {
    console.error('Submit brief error:', error);
    res.status(500).json({ 
      error: 'Failed to submit brief',
      details: error.message 
    });
  }
} 