import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { interview_id: _interview_id, transcript } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('AIzaSy_placeholder') || apiKey.includes('placeholder') || apiKey === 'AIzaSy...') {
      // Return a structured mock evaluation response in local simulation mode
      return NextResponse.json(getMockEvaluationResponse(transcript));
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            overall_score: { type: SchemaType.INTEGER, description: 'Overall score from 0 to 100' },
            technical_accuracy_score: { type: SchemaType.INTEGER, description: 'Technical depth and correctness score from 0 to 100' },
            communication_score: { type: SchemaType.INTEGER, description: 'Clarity, structuring, and phrasing score from 0 to 100' },
            problem_solving_score: { type: SchemaType.INTEGER, description: 'Logical reasoning and edge-case handling score from 0 to 100' },
            key_strengths: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'List of 3 concrete technical/behavioral strengths demonstrated'
            },
            areas_for_improvement: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: 'List of 3 concrete areas that need technical or structural refinement'
            },
            detailed_feedback: { type: SchemaType.STRING, description: 'A detailed evaluation summary paragraph' }
          },
          required: [
            'overall_score',
            'technical_accuracy_score',
            'communication_score',
            'problem_solving_score',
            'key_strengths',
            'areas_for_improvement',
            'detailed_feedback'
          ]
        }
      }
    });

    // Format the transcript for analysis
    const formattedTranscript = (transcript || [])
      .map((msg: { sender: string; message: string }) => `${msg.sender === 'ai' ? 'AI Interviewer' : 'Candidate'}: ${msg.message}`)
      .join('\n\n');

    const prompt = `Analyze this technical interview transcript and generate a structured evaluation report.
Assess the candidate's performance across Technical Accuracy, Communication, and Problem Solving.

Transcript:
${formattedTranscript}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const evaluationData = JSON.parse(text);

    return NextResponse.json(evaluationData);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in interview evaluation API:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during evaluation processing.' },
      { status: 500 }
    );
  }
}

function getMockEvaluationResponse(transcript: { sender: string; message: string }[]) {
  // Generate slightly dynamic scores based on length of transcript for realism
  const userAnswersCount = transcript ? transcript.filter((t: { sender: string }) => t.sender === 'user').length : 0;
  
  let overall = 78;
  let technical = 80;
  let communication = 74;
  let problemSolving = 80;

  if (userAnswersCount >= 3) {
    overall = 85;
    technical = 89;
    communication = 82;
    problemSolving = 84;
  } else if (userAnswersCount === 0) {
    overall = 50;
    technical = 50;
    communication = 50;
    problemSolving = 50;
  }

  return {
    overall_score: overall,
    technical_accuracy_score: technical,
    communication_score: communication,
    problem_solving_score: problemSolving,
    key_strengths: [
      "Demonstrates solid grasp of virtual DOM updates and rendering engine boundaries.",
      "Clear differentiation between Next.js server-side and client-side rendering strategies.",
      "Structured articulation of local state limits and architectural optimization."
    ],
    areas_for_improvement: [
      "Explain the exact computational complexity of the diffing cycles (e.g. O(n)).",
      "Mention Incremental Static Regeneration (ISR) when optimizing for server load limits.",
      "Utilize structural templates (STAR) when responding to conversational questions."
    ],
    detailed_feedback: `You completed a short mock session. You demonstrated good fundamental knowledge of Frontend React internals. To reach the next level, practice expanding your descriptions to cover advanced Next.js patterns (Middleware, ISR, Server Components) and focus on keeping pacing consistent when answering under pressure.`
  };
}
