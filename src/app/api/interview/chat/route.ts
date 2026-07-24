import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { role, level, history, resumeText } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.startsWith('AIzaSy_placeholder') || apiKey.includes('placeholder') || apiKey === 'AIzaSy...') {
      // In local simulation, if GEMINI_API_KEY is not set or is a placeholder,
      // return a highly realistic mock fallback response to ensure clean frontend execution.
      return simulateInterviewerResponse(role, level, history, resumeText);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let systemInstruction = `You are an empathetic yet rigorous technical interviewer conducting a mock interview.
The candidate is interviewing for the role: "${role}" at the experience level: "${level}".
Your goals:
1. Ask clear, targeted, and relevant technical and behavioral questions one at a time.
2. Be empathetic and supportive but maintain high rigorous standards.
3. Keep your questions concise (1-2 sentences maximum). Do not write paragraphs or explanations.
4. Listen to the candidate's responses. Feel free to follow up on their previous answer to probe deeper if their answer is vague, incomplete, or interesting, before moving to a new topic.
5. Do not output feedback, evaluations, or grades during the chat. Save evaluations for the end of the interview.`;

    if (resumeText) {
      systemInstruction += `\n\nCandidate Background:
${resumeText}

Goal 6: Personalize the interview by tailoring technical and behavioral questions directly to the projects, languages, architectures, frameworks, and tools listed on the candidate's resume above. Probe their deep technical involvement in the projects they mention.`;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
    });

    // Format chat history for Gemini
    // Gemini expects: Array of { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedHistory = (history || []).map((msg: { sender: string; message: string }) => ({
      role: msg.sender === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.message || '' }]
    }));

    if (formattedHistory.length === 0) {
      // First call (greeting / initial question)
      const result = await model.generateContent(
        'Please introduce yourself, state the role you are interviewing the candidate for, and ask the first question.'
      );
      const text = result.response.text().trim();
      return NextResponse.json({ text });
    }

    // Get the latest user message
    const lastUserMessage = formattedHistory[formattedHistory.length - 1];
    
    // Slice off the latest message to pass as the chat parameter
    const previousHistory = formattedHistory.slice(0, -1);

    const chat = model.startChat({
      history: previousHistory,
    });

    const result = await chat.sendMessage(lastUserMessage.parts[0].text);
    const text = result.response.text().trim();

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in interview chat API:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred during generative processing.' },
      { status: 500 }
    );
  }
}

// Fallback simulator to ensure testing works seamlessly even without a live API key
function simulateInterviewerResponse(role: string, level: string, history: { sender: string; message: string }[], resumeText?: string) {
  const count = history ? history.filter((h: { sender: string }) => h.sender === 'user').length : 0;
  let text = '';

  // Parse a skill from the resume text for dynamic mockup response
  let specialTopic = '';
  if (resumeText) {
    const lower = resumeText.toLowerCase();
    if (lower.includes('typescript')) specialTopic = 'TypeScript compilation and typing';
    else if (lower.includes('docker')) specialTopic = 'Docker containerization and orchestration';
    else if (lower.includes('python')) specialTopic = 'concurrency in Python';
    else if (lower.includes('graphql')) specialTopic = 'GraphQL query optimization';
    else if (lower.includes('tailwind')) specialTopic = 'Tailwind CSS responsive setups';
    else if (lower.includes('rust')) specialTopic = 'Rust memory safety lifetimes';
  }

  if (count === 0) {
    text = `Hello! Welcome to your mock interview for the ${level} ${role} position. ${specialTopic ? `I noticed on your resume you have experience with ${specialTopic}. ` : ''}Let's start with a general question: can you explain your background and your experience with key technologies in this domain?`;
  } else if (count === 1) {
    if (specialTopic) {
      text = `Excellent. Let's drill into the experience you mentioned. Could you describe a challenging problem you faced related to ${specialTopic} in one of your projects, and how you resolved it?`;
    } else if (role.toLowerCase().includes('frontend') || role.toLowerCase().includes('react')) {
      text = `Excellent. Let's dive into some frontend topics. Can you explain the difference between client-side rendering (CSR) and server-side rendering (SSR) in Next.js, and when you would choose one over the other?`;
    } else {
      text = `Great. Let's talk system design. How would you design a rate-limiting system for a high-traffic public API to prevent abuse?`;
    }
  } else if (count === 2) {
    text = `That is a solid explanation. How do you approach error handling and ensuring service stability in those scenarios?`;
  } else {
    text = `Thank you for those insights. We have covered a good range of topics. I would like to conclude the interview here. Feel free to click "End Interview" to see your evaluation report!`;
  }

  return NextResponse.json({ text });
}
