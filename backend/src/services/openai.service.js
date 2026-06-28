import OpenAI from 'openai';

// Lazy initialization - don't crash if key is missing
let openai = null;

const getClient = () => {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please add it in Railway Variables.');
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
};

// ── CV Enhancement ──
export const enhanceCVWithAI = async (rawText, jobTitle) => {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert ATS-optimization specialist. Return ONLY valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `Target Job Title: ${jobTitle || 'Not specified'}
Raw CV Content: ${rawText}

Return JSON:
{
  "personalInfo": { "name": "", "email": "", "phone": "", "location": "" },
  "summary": "3-4 line professional summary",
  "skills": ["skill1", "skill2"],
  "experience": [{ "title": "", "company": "", "duration": "", "bullets": ["achievement"] }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "certifications": [],
  "languages": [],
  "atsScore": 85,
  "improvements": ["improvement 1"],
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

// ── Assessment Generation ──
export const generateAssessment = async (jobTitle, skills) => {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a senior technical interviewer. Return ONLY valid JSON, no markdown.' },
      {
        role: 'user',
        content: `Job Title: ${jobTitle}
Skills to assess: ${skills.join(', ')}

Generate 10 questions. Return JSON:
{
  "title": "Assessment title",
  "estimatedMinutes": 25,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "skill": "skill name",
      "difficulty": "medium",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why correct"
    }
  ]
}
Mix: 5 multiple_choice, 3 open_ended, 2 coding.`,
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

// ── Score Assessment ──
export const scoreAssessment = async (questions, answers) => {
  const client = getClient();
  const qa = questions.map(q => ({
    question: q.question,
    type: q.type,
    skill: q.skill,
    correctAnswer: q.correctAnswer || q.keyPoints || q.expectedOutput,
    userAnswer: answers[q.id] || '',
  }));

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a technical assessment scorer. Return ONLY valid JSON.' },
      {
        role: 'user',
        content: `Score these answers: ${JSON.stringify(qa, null, 2)}

Return JSON:
{
  "totalScore": 78,
  "passed": true,
  "skillScores": { "JavaScript": 85 },
  "feedback": [{ "questionIndex": 0, "score": 100, "feedback": "Correct" }],
  "strengths": ["skill1"],
  "weaknesses": ["skill2"],
  "verifiedSkills": ["skill1"]
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

// ── Job Matching ──
export const matchJobsWithAI = async (userSkills, userProfile, jobs) => {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a job matching AI. Return ONLY valid JSON.' },
      {
        role: 'user',
        content: `Candidate Skills: ${userSkills.join(', ')}
Job Title: ${userProfile.jobTitle || 'Not specified'}

Jobs:
${jobs.map((j, i) => `[${i}] ${j.title} at ${j.company} | Requirements: ${j.requirements?.join(', ')}`).join('\n')}

Return JSON array (top 10 matches):
[{ "jobIndex": 0, "score": 92, "matchedSkills": ["skill1"], "missingSkills": ["skill2"], "reasons": ["reason"] }]`,
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

// ── Cover Letter ──
export const generateCoverLetter = async (userProfile, cvData, job) => {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert cover letter writer. Write compelling, personalized cover letters.',
      },
      {
        role: 'user',
        content: `Candidate: ${userProfile.firstName} ${userProfile.lastName}
Job: ${job.title} at ${job.company}
Description: ${job.description?.substring(0, 800)}
Skills: ${(userProfile.skills || []).join(', ')}
Summary: ${cvData?.summary || ''}

Write a professional 3-4 paragraph cover letter.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return response.choices[0].message.content;
};
