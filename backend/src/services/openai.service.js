import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── CV Enhancement ──────────────────────────────────────────────────
export const enhanceCVWithAI = async (rawText, jobTitle) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert ATS-optimization specialist and professional CV writer with 20+ years of experience.
Your task is to rewrite the provided CV to:
1. Be fully ATS (Applicant Tracking System) compatible
2. Use strong action verbs and quantified achievements
3. Include relevant keywords for the role
4. Follow the exact ATS-friendly structure below
5. Return a JSON object with the following structure

Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Target Job Title: ${jobTitle || 'Not specified'}

Raw CV Content:
${rawText}

Return JSON with this exact structure:
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
}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error('Failed to parse CV enhancement response');
  }
};

// ── Assessment Generation ───────────────────────────────────────────
export const generateAssessment = async (jobTitle, skills) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a senior technical interviewer creating assessments to verify candidates' real skills.
Create challenging but fair questions that truly test knowledge — not just memorization.
Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Job Title: ${jobTitle}
Skills to assess: ${skills.join(', ')}

Generate a 10-question mixed assessment. Return JSON:
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
      "expectedOutput": "description of expected output",
      "testCases": [{ "input": "example", "output": "expected" }]
    },
    {
      "id": "q3",
      "type": "open_ended",
      "skill": "skill being tested",
      "difficulty": "hard",
      "question": "Explain how you would...",
      "keyPoints": ["point 1", "point 2", "point 3"]
    }
  ]
}
Mix: 5 multiple_choice, 3 open_ended, 2 coding questions.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error('Failed to parse assessment response');
  }
};

// ── Score Assessment ────────────────────────────────────────────────
export const scoreAssessment = async (questions, answers) => {
  const qa = questions.map((q, i) => ({
    question: q.question,
    type: q.type,
    skill: q.skill,
    correctAnswer: q.correctAnswer || q.keyPoints || q.expectedOutput,
    userAnswer: answers[q.id] || '',
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a technical assessment scorer. Be fair but strict. Return ONLY valid JSON.',
      },
      {
        role: 'user',
        content: `Score these answers:

${JSON.stringify(qa, null, 2)}

Return JSON:
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
}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error('Failed to parse scoring response');
  }
};

// ── Job Matching ────────────────────────────────────────────────────
export const matchJobsWithAI = async (userSkills, userProfile, jobs) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert job matching AI. Analyze skill overlap deeply. Return ONLY valid JSON.',
      },
      {
        role: 'user',
        content: `Candidate Profile:
- Job Title: ${userProfile.jobTitle}
- Verified Skills: ${userSkills.join(', ')}
- Years Experience: ${userProfile.yearsExperience || 'Unknown'}
- Location: ${userProfile.location || 'Flexible'}

Jobs to match (up to 20):
${jobs.map((j, i) => `[${i}] ${j.title} at ${j.company} | Requirements: ${j.requirements?.join(', ')}`).join('\n')}

Return JSON array of top matches (max 10):
[
  {
    "jobIndex": 0,
    "score": 92,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill3"],
    "reasons": ["Strong match in...", "Experience aligns with..."]
  }
]
Order by score descending.`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  try {
    return JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error('Failed to parse matching response');
  }
};

// ── Cover Letter Generation ─────────────────────────────────────────
export const generateCoverLetter = async (userProfile, cvData, job) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert cover letter writer. Write compelling, personalized cover letters that:
1. Open with a strong hook — not "I am writing to apply for..."
2. Connect the candidate's specific experience to the role's needs
3. Demonstrate knowledge of the company
4. End with a confident call to action
Keep it to 3-4 paragraphs, professional yet human.`,
      },
      {
        role: 'user',
        content: `Candidate: ${userProfile.firstName} ${userProfile.lastName}
Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description?.substring(0, 1000)}
Candidate's Key Skills: ${(userProfile.skills || []).join(', ')}
Candidate's Summary: ${cvData?.summary || ''}
Years of Experience: ${userProfile.yearsExperience || ''}

Write a professional cover letter.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0].message.content;
};
