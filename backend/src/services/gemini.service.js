import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

const getClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Please add it in Railway Variables.');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const getModel = () => {
  const client = getClient();
  return client.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
};

const parseJsonResponse = (text) => {
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch (err) {
    console.error('Failed to parse Gemini response:', text.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }
};

// ── CV Enhancement ──────────────────────────────────────────────────
export const enhanceCVWithAI = async (rawText, jobTitle) => {
  const model = getModel();

  const prompt = `You are an expert ATS-optimization specialist and professional CV writer with 20+ years of experience.

Target Job Title: ${jobTitle || 'Not specified'}

Raw CV Content:
${rawText.substring(0, 6000)}

Rewrite this CV to be fully ATS-compatible. Return ONLY valid JSON with this exact structure, no markdown, no preamble:
{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
  "summary": "3-4 line professional summary optimized for ATS",
  "skills": ["skill1", "skill2"],
  "experience": [{ "title": "", "company": "", "duration": "", "location": "", "bullets": ["achievement 1", "achievement 2"] }],
  "education": [{ "degree": "", "institution": "", "year": "", "gpa": "" }],
  "certifications": [{ "name": "", "issuer": "", "year": "" }],
  "languages": [{ "language": "", "level": "" }],
  "atsScore": 85,
  "improvements": ["improvement 1", "improvement 2"],
  "extractedSkills": ["skill1", "skill2"]
}`;

  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
};

// ── Assessment Generation ───────────────────────────────────────────
export const generateAssessment = async (jobTitle, skills) => {
  const model = getModel();

  const prompt = `You are a senior technical interviewer creating assessments to verify candidates' real skills.

Job Title: ${jobTitle}
Skills to assess: ${skills.join(', ')}

Generate a 10-question mixed assessment (5 multiple_choice, 3 open_ended, 2 coding). Return ONLY valid JSON, no markdown:
{
  "title": "Assessment title",
  "estimatedMinutes": 25,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "skill": "skill being tested",
      "difficulty": "easy|medium|hard",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    },
    {
      "id": "q2",
      "type": "coding",
      "skill": "skill being tested",
      "difficulty": "medium",
      "question": "Write a function that...",
      "expectedOutput": "description",
      "testCases": [{ "input": "example", "output": "expected" }]
    },
    {
      "id": "q3",
      "type": "open_ended",
      "skill": "skill being tested",
      "difficulty": "hard",
      "question": "Explain how you would...",
      "keyPoints": ["point 1", "point 2"]
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
};

// ── Score Assessment ────────────────────────────────────────────────
export const scoreAssessment = async (questions, answers) => {
  const model = getModel();

  const qa = questions.map(q => ({
    question:      q.question,
    type:          q.type,
    skill:         q.skill,
    correctAnswer: q.correctAnswer || q.keyPoints || q.expectedOutput,
    userAnswer:    answers[q.id] || '',
  }));

  const prompt = `You are a technical assessment scorer. Be fair but strict.

Score these answers:
${JSON.stringify(qa, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "totalScore": 78,
  "passed": true,
  "skillScores": { "JavaScript": 85, "React": 70 },
  "feedback": [
    { "questionIndex": 0, "score": 100, "feedback": "Correct" },
    { "questionIndex": 1, "score": 60, "feedback": "Partially correct..." }
  ],
  "strengths": ["skill1", "skill2"],
  "weaknesses": ["skill3"],
  "verifiedSkills": ["skill1", "skill2"]
}
(passed should be true if totalScore >= 60)`;

  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
};

// ── Job Matching ────────────────────────────────────────────────────
export const matchJobsWithAI = async (userSkills, userProfile, jobs) => {
  const model = getModel();

  const prompt = `You are an expert job matching AI. Analyze skill overlap deeply.

Candidate Profile:
- Job Title: ${userProfile.jobTitle || 'Not specified'}
- Verified Skills: ${userSkills.join(', ')}
- Years Experience: ${userProfile.yearsExperience || 'Unknown'}
- Location: ${userProfile.location || 'Flexible'}

Jobs to match:
${jobs.map((j, i) => `[${i}] ${j.title} at ${j.company} | Requirements: ${j.requirements?.join(', ')}`).join('\n')}

Return ONLY valid JSON array of top matches (max 10), ordered by score descending, no markdown:
[
  {
    "jobIndex": 0,
    "score": 92,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3"],
    "reasons": ["Strong match in...", "Experience aligns with..."]
  }
]`;

  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
};

// ── Cover Letter Generation ─────────────────────────────────────────
export const generateCoverLetter = async (userProfile, cvData, job) => {
  const client = getClient();
  const model  = client.getGenerativeModel({ model: 'gemini-1.5-flash' }); // plain text, not JSON

  const prompt = `You are an expert cover letter writer. Write a compelling, personalized cover letter that:
1. Opens with a strong hook — not "I am writing to apply for..."
2. Connects the candidate's specific experience to the role's needs
3. Demonstrates knowledge of the company
4. Ends with a confident call to action
Keep it to 3-4 paragraphs, professional yet human.

Candidate: ${userProfile.firstName} ${userProfile.lastName}
Job Title: ${job.title}
Company: ${job.company}
Job Description: ${(job.description || '').substring(0, 1000)}
Candidate's Key Skills: ${(userProfile.skills || []).join(', ')}
Candidate's Summary: ${cvData?.summary || ''}
Years of Experience: ${userProfile.yearsExperience || ''}

Write the cover letter now (plain text, no markdown formatting):`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};
