import axios from 'axios';
import { prisma } from '../utils/prisma.js';

const RAPIDAPI_KEY = process.env.JSEARCH_API_KEY;
const RAPIDAPI_HOST = 'jsearch.p.rapidapi.com';

const jsearchClient = axios.create({
  baseURL: 'https://jsearch.p.rapidapi.com',
  headers: {
    'x-rapidapi-key':  RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
    'Content-Type':    'application/json',
  },
  timeout: 15000,
});

// ── Search queries for Egypt market ──
const EGYPT_QUERIES = [
  'software developer Egypt',
  'frontend developer Egypt',
  'backend developer Egypt',
  'full stack developer Egypt',
  'UI UX designer Egypt',
  'data scientist Egypt',
  'DevOps engineer Egypt',
  'product manager Egypt',
  'marketing Egypt',
  'accountant Egypt',
  'customer service Egypt',
  'sales Egypt',
  'HR Egypt',
  'project manager Egypt',
  'mobile developer Egypt',
];

// ── Fetch jobs from JSearch ──
const fetchJSearchJobs = async (query, page = 1) => {
  try {
    const { data } = await jsearchClient.get('/search', {
      params: {
        query,
        page,
        num_pages:          1,
        date_posted:        'month',
        remote_jobs_only:   false,
        employment_types:   'FULLTIME,PARTTIME,CONTRACTOR',
      },
    });

    return (data.data || []).map(job => ({
      externalId:   `jsearch-${job.job_id}`,
      title:        job.job_title?.substring(0, 255) || 'Unknown Title',
      company:      job.employer_name?.substring(0, 255) || 'Unknown Company',
      location:     job.job_city
        ? `${job.job_city}${job.job_country ? ', ' + job.job_country : ''}`
        : job.job_country || 'Egypt',
      type:         job.job_employment_type || 'Full-time',
      salary:       job.job_min_salary
        ? `${job.job_min_salary} - ${job.job_max_salary || ''} ${job.job_salary_currency || 'USD'}`
        : null,
      description:  (job.job_description || '').substring(0, 3000),
      requirements: extractRequirements(job),
      source:       detectSource(job.job_apply_link || job.employer_website || ''),
      sourceUrl:    job.job_apply_link || job.employer_website || 'https://jsearch.p.rapidapi.com',
      postedAt:     job.job_posted_at_datetime_utc
        ? new Date(job.job_posted_at_datetime_utc)
        : new Date(),
    }));
  } catch (err) {
    console.warn(`JSearch query failed [${query}]:`, err.message);
    return [];
  }
};

// ── Detect source from URL ──
const detectSource = (url = '') => {
  if (url.includes('linkedin'))  return 'linkedin';
  if (url.includes('indeed'))    return 'indeed';
  if (url.includes('glassdoor')) return 'glassdoor';
  if (url.includes('monster'))   return 'monster';
  if (url.includes('wuzzuf'))    return 'wuzzuf';
  if (url.includes('forasna'))   return 'forasna';
  if (url.includes('bayt'))      return 'bayt';
  return 'jsearch';
};

// ── Extract requirements from job data ──
const extractRequirements = (job) => {
  const techKeywords = [
    'JavaScript','TypeScript','React','Vue','Angular','Node.js','Express',
    'Python','Django','FastAPI','Java','Spring','PHP','Laravel','Ruby',
    'Go','Rust','C++','C#','.NET','SQL','PostgreSQL','MySQL','MongoDB',
    'Redis','Docker','Kubernetes','AWS','Azure','GCP','Linux','Git',
    'REST','GraphQL','Microservices','DevOps','CI/CD','Figma','UI/UX',
    'Machine Learning','AI','Data Science','TensorFlow','PyTorch',
    'Selenium','Testing','Agile','Scrum','Excel','PowerPoint','SAP',
    'Marketing','Sales','CRM','ERP','Accounting','Finance',
  ];

  const text = [
    job.job_title || '',
    job.job_description || '',
    ...(job.job_highlights?.Qualifications || []),
    ...(job.job_highlights?.Responsibilities || []),
  ].join(' ');

  const found = techKeywords.filter(kw =>
    text.toLowerCase().includes(kw.toLowerCase())
  );

  // Add title words
  const titleWords = (job.job_title || '').split(/\s+/).filter(w => w.length > 3);

  return [...new Set([...found, ...titleWords])].slice(0, 15);
};

// ── Main fetch & save function ──
export const fetchAndSaveJSearchJobs = async () => {
  if (!RAPIDAPI_KEY) {
    console.warn('JSEARCH_API_KEY not set — skipping JSearch fetch');
    return 0;
  }

  console.log('🔍 Fetching jobs from JSearch API...');
  let totalSaved = 0;

  // Fetch in batches to avoid rate limits
  for (let i = 0; i < EGYPT_QUERIES.length; i++) {
    const query = EGYPT_QUERIES[i];

    try {
      const jobs = await fetchJSearchJobs(query);
      console.log(`  [${i + 1}/${EGYPT_QUERIES.length}] "${query}" → ${jobs.length} jobs`);

      for (const job of jobs) {
        if (!job.title || !job.sourceUrl) continue;
        try {
          await prisma.job.upsert({
            where:  { externalId: job.externalId },
            update: {
              isActive:  true,
              scrapedAt: new Date(),
              description: job.description,
            },
            create: job,
          });
          totalSaved++;
        } catch (err) {
          // Skip duplicates
        }
      }

      // Rate limit: wait 500ms between requests
      if (i < EGYPT_QUERIES.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.warn(`Failed query: ${query}`, err.message);
    }
  }

  console.log(`✅ JSearch: saved/updated ${totalSaved} jobs`);
  return totalSaved;
};

// ── Search specific query (for on-demand search) ──
export const searchJobs = async (query, page = 1) => {
  if (!RAPIDAPI_KEY) return [];
  return fetchJSearchJobs(query, page);
};
