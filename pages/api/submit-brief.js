import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Relay.app webhook URL
const RELAY_WEBHOOK_URL = 'https://hook.relay.app/api/v1/playbook/cmc0vmws00yog0om4hdzv5y08/trigger/Kiu7f2kCDRcPkdMEY7WNUw';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== SUBMIT BRIEF DEBUG ===');
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    
    const { conversationHistory, conversationId } = req.body;
    console.log('Conversation length:', conversationHistory?.length);

    // RIGID JSON structure for consistent Relay.app webhook integration
    const extractionPrompt = `Analyze this conversation and extract information into this EXACT JSON structure.

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
  "conversationSummary": "string - 2-3 sentence summary of the conversation"
}

FIELD DEFINITIONS:
- requestType: "meeting"=wants consultation, "proposal"=has specific project, "test"=wants samples, "unclear"=not sure
- serviceCategory: "production"=final assets, "concepts"=creative work, "labs"=AI exploration, "unclear"=not determined
- readinessLevel: "browsing"=just looking, "interested"=considering, "ready"=wants to proceed, "qualified"=serious prospect
- engagementLevel: "low"=casual interest, "medium"=asking questions, "high"=detailed discussion

Use "Not provided" for missing contact info. Use "Unclear" for classification fields when uncertain.
Be specific and detailed in projectBrief and conversationSummary.

Conversation to analyze:
${conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n')}`;

    console.log('Calling Anthropic for progressive disclosure extraction...');
    const extractionResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: extractionPrompt }]
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

    // Extract any uploaded files from conversation with categorization
    const uploadedFiles = conversationHistory
      .filter(msg => msg.role === 'user' && (msg.content.includes('📦 Uploaded') || msg.content.includes('🎨 Uploaded')))
      .map(msg => {
        const isProduct = msg.content.includes('📦 Uploaded Product Image:');
        const fileName = msg.content.replace(/^[📦🎨] Uploaded (Product Image|Style Reference): /, '');
        
        // Find the actual file info from the message
        const fileMessage = conversationHistory.find(m => 
          m.role === 'user' && m.file && m.file.originalName === fileName
        );
        
        return {
          fileName,
          originalName: fileName,
          type: isProduct ? 'product' : 'reference',
          category: isProduct ? 'Product Image' : 'Style Reference',
          // Add full public URL for Relay to access
          url: fileMessage?.file ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}${fileMessage.file.url}` : null,
          size: fileMessage?.file?.size,
          mimetype: fileMessage?.file?.mimetype
        };
      });

    // Separate product images and style references for better organization
    const productImages = uploadedFiles.filter(f => f.type === 'product');
    const styleReferences = uploadedFiles.filter(f => f.type === 'reference');

          // Add system metadata (consistent with rigid structure)
    const finalPayload = {
      ...leadData,
      // System metadata
      conversationId: conversationId,
      timestamp: new Date().toISOString(),
      source: "IM Chat Widget",
      conversationLength: conversationHistory?.length || 0,
      extractedAt: new Date().toISOString(),
      // Enhanced file categorization
      uploadedFiles: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      productImages: productImages.length > 0 ? productImages : undefined,
      styleReferences: styleReferences.length > 0 ? styleReferences : undefined,
      autoSubmit: req.body.autoSubmit || false,
      // Reference for later file uploads
      emailReference: `Project REF: ${conversationId}`,
      fileUploadInstructions: uploadedFiles.length === 0 ? 
        `To send files later, email them to jacob@intelligencematters.se with subject: "Project REF: ${conversationId}". Please specify if sending PRODUCT IMAGES (your actual products) or STYLE REFERENCES (inspiration examples).` : 
        undefined
    };

    console.log('Sending RIGID JSON to Relay.app...');
    console.log('Payload:', JSON.stringify(finalPayload, null, 2));

    // Send to Relay.app webhook
    const webhookResponse = await fetch(RELAY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    const webhookResult = await webhookResponse.text();
    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response:', webhookResult);

    if (!webhookResponse.ok) {
      console.error('WEBHOOK ERROR DETAILS:');
      console.error('Status:', webhookResponse.status);
      console.error('Status Text:', webhookResponse.statusText);
      console.error('Response Body:', webhookResult);
      console.error('Payload Size:', JSON.stringify(finalPayload).length, 'characters');
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText} - ${webhookResult}`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Rigid JSON structure submitted successfully to Relay.app',
      leadData: finalPayload,
      quickAnalysis: {
        requestType: leadData.requestType,
        readinessLevel: leadData.readinessLevel,
        nextSteps: leadData.nextSteps
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