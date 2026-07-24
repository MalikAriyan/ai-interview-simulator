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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const promptText = `Analyze the uploaded resume document and extract a comprehensive, structured text summary.
Include:
1. Candidate Professional Summary
2. Core Technical Skills & Frameworks
3. Estimated Years of Experience
4. Key Past Roles & Achievements
Output the extracted text directly in a clean structured plain-text format, suitable to be injected as candidate background in a system instruction.`;

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
