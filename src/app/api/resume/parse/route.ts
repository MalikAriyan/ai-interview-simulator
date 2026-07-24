import { NextResponse } from 'next/server';

// Polyfill DOMMatrix globally on the server side before importing pdf-parse.
// This prevents cjs crashes because pdf-parse tries to resolve canvas dependencies.
if (typeof global !== 'undefined' && !('DOMMatrix' in global)) {
  Object.defineProperty(global, 'DOMMatrix', {
    value: class DOMMatrix {},
    writable: true,
    configurable: true,
  });
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file was provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from the PDF buffer
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || '';

    return NextResponse.json({ text: text.trim() });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error parsing PDF resume:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to parse the uploaded PDF resume.' },
      { status: 500 }
    );
  }
}
