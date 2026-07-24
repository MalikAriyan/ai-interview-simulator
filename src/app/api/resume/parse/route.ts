import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('AIzaSy_placeholder') || apiKey.includes('placeholder')) {
      return NextResponse.json({ 
        error: 'Gemini API key is missing or not configured. Please add GEMINI_API_KEY to your environment.' 
      }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    let extractedText = '';

    const promptText = `Analyze the uploaded resume document and extract a comprehensive, structured text summary.
Include:
1. Candidate Professional Summary
2. Core Technical Skills & Frameworks
3. Estimated Years of Experience
4. Key Past Roles & Achievements
Output the extracted text directly in a clean structured plain-text format, suitable to be injected as candidate background in a system instruction.`;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      // 1. Image formats or PDF -> Process via Multimodal Base64
      if (
        mimeType.startsWith('image/') ||
        mimeType === 'application/pdf'
      ) {
        const base64Data = buffer.toString('base64');
        
        const response = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          promptText
        ]);

        extractedText = response.response.text();
      } 
      // 2. Word documents (.docx) -> Extract text via mammoth and pass to Gemini
      else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        const { value: docxText } = await mammoth.extractRawText({ buffer });
        
        const response = await model.generateContent([
          `Document text:
${docxText}

${promptText}`
        ]);

        extractedText = response.response.text();
      } 
      // 3. Plain text files -> Read as text and pass to Gemini
      else if (
        mimeType.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md')
      ) {
        const rawText = buffer.toString('utf-8');
        
        const response = await model.generateContent([
          `Document text:
${rawText}

${promptText}`
        ]);

        extractedText = response.response.text();
      } 
      // 4. Unsupported format -> Throw error
      else {
        return NextResponse.json({ 
          error: `Unsupported file format (${mimeType || 'unknown'}). Supported formats are: PDF, DOCX, Images, and Text files.` 
        }, { status: 400 });
      }
    } catch (apiErr) {
      console.warn('Gemini parser API failed, falling back to local text extraction:', apiErr);
      extractedText = await getLocalTextFallback(buffer, file);
    }

    return NextResponse.json({ text: extractedText.trim() });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error parsing resume file:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during multi-format resume parsing.' },
      { status: 500 }
    );
  }
}

// Fallback plain text extractor
async function getLocalTextFallback(buffer: Buffer, file: File): Promise<string> {
  try {
    const mimeType = file.type;
    
    // Word document extraction fallback
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const { value: docxText } = await mammoth.extractRawText({ buffer });
      if (docxText && docxText.trim().length > 10) {
        return docxText;
      }
    }
    
    // Plain text extraction fallback
    if (mimeType.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return buffer.toString('utf-8');
    }
    
    // PDF raw string token extraction fallback
    if (mimeType === 'application/pdf' || file.name.endsWith('.pdf')) {
      const rawString = buffer.toString('binary');
      const regexMatches = rawString.match(/\(([^)]+)\)/g);
      if (regexMatches && regexMatches.length > 5) {
        const textParts = regexMatches
          .map((m) => m.substring(1, m.length - 1))
          .filter((t) => t.trim().length > 2 && !t.includes('\\'))
          .slice(0, 300);
        if (textParts.length > 10) {
          return textParts.join(' ');
        }
      }
    }
  } catch (e) {
    console.error('Local fallback parser execution error:', e);
  }
  
  return `Resume details from file: ${file.name}\nUploaded on: ${new Date().toLocaleDateString()}\n\n[Please paste or type your resume details here to tailor simulated technical mock sessions]`;
}
