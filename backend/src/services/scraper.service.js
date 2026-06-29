import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { egyptianDemoJobs } from '../data/egyptian-jobs.js';

export const extractKeywords = (text = '') => {
  const keywords = [
    'JavaScript','TypeScript','React','Vue','Angular','Node.js','Express',
    'Python','Django','FastAPI','Java','Spring','PHP','Laravel','Ruby','Rails',
    'Go','Golang','C++','C#','.NET','SQL','PostgreSQL','MySQL','MongoDB','Redis',
    'Docker','Kubernetes','AWS','Azure','GCP','Linux','Git','REST','GraphQL',
    'Microservices','DevOps','CI/CD','Figma','UI/UX','Machine Learning','AI',
    'Data Science','TensorFlow','PyTorch','Flutter','Swift','Android','iOS',
    'React Native','Selenium','Testing','Agile','Scrum','SAP','Oracle','Blockchain',
    'Solidity','Power BI','Tableau','Excel','AutoCAD','Revit','BIM','SCADA','PLC',
    'Networking','Cisco','Linux','Cybersecurity','Penetration Testing','Cloud',
    'Terraform','Ansible','Airflow','Spark','dbt','Kotlin','MVVM','SwiftUI',
    'Marketing','Sales','SEO','Google Ads','Meta Ads','Brand Management','FMCG',
    'Finance','Accounting','Banking','Risk Analysis','Treasury','Bloomberg',
    'HR','Recruitment','Labor Law','Supply Chain','Logistics','Operations',
    'Product Management','Business Analysis','Project Management','Scrum Master',
    'Graphic Design','Adobe Photoshop','Illustrator','Video Editing','Content Creation',
    'Petroleum Engineering','Chemical Engineering','Civil Engineering','Electrical Engineering',
    'Marine Engineering','Renewable Energy','Solar','Instrumentation','Oil & Gas',
  ];
  const found = keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  return [...new Set(found)].slice(0, 15);
};

// ── SerpApi - Google Jobs ──
const fetchGoogleJobsEgypt = async (apiKey) => {
  const jobs = [];
  const searches = [
    'software developer jobs Egypt',
    'marketing jobs Cairo Egypt',
    'engineering jobs Egypt',
    'finance jobs Cairo',
    'remote jobs Egypt',
    'وظائف القاهرة تقنية',
    'data scientist jobs Egypt',
    'product manager jobs Egypt',
  ];

  for (const q of searches) {
    try {
      const { data } = await axios.get('https://serpapi.com/search', {
        params: { engine: 'google_jobs', q, location: 'Egypt', hl: 'en', api_key: apiKey },
        timeout: 15000,
      });

      for (const job of (data.jobs_results || [])) {
        const src = (job.via || '').replace('via ', '').toLowerCase();
        jobs.push({
          externalId:   `serpapi-${Buffer.from((job.title||'') + (job.company_name||'')).toString('base64').substring(0, 40)}`,
          title:        (job.title || '').substring(0, 255),
          company:      (job.company_name || 'Unknown').substring(0, 255),
          location:     job.location || 'Egypt',
          type:         job.detected_extensions?.schedule_type || null,
          salary:       job.detected_extensions?.salary || null,
          description:  (job.description || '').substring(0, 2000),
          requirements: extractKeywords((job.title || '') + ' ' + (job.description || '')),
          source:       src.includes('wuzzuf') ? 'wuzzuf' : src.includes('forasna') ? 'forasna' : src.includes('linkedin') ? 'linkedin' : src.includes('indeed') ? 'indeed' : 'google_jobs',
          sourceUrl:    job.related_links?.[0]?.link || job.share_link || 'https://google.com/jobs',
          postedAt:     new Date(),
        });
      }
    } catch (err) {
      console.warn(`SerpApi "${q}" failed:`, err.message);
    }
  }
  return jobs;
};

// ── JSearch API ──
const fetchJSearchJobs = async (apiKey) => {
  const jobs = [];
  const queries = ['jobs in Egypt', 'remote jobs Egypt', 'software engineer Cairo', 'marketing Egypt', 'finance Egypt'];

  for (const query of queries) {
    try {
      const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
        params: { query, page: '1', num_pages: '3', country: 'eg' },
        headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
        timeout: 15000,
      });

      for (const job of (data.data || [])) {
        jobs.push({
          externalId:   `jsearch-${job.job_id}`,
          title:        (job.job_title || '').substring(0, 255),
          company:      (job.employer_name || 'Unknown').substring(0, 255),
          location:     job.job_city ? `${job.job_city}, Egypt` : 'Egypt',
          type:         job.job_employment_type || null,
          salary:       job.job_min_salary ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency || 'USD'}` : null,
          description:  (job.job_description || '').substring(0, 2000),
          requirements: extractKeywords((job.job_title || '') + ' ' + (job.job_description || '')),
          source:       (job.job_publisher || '').toLowerCase().includes('linkedin') ? 'linkedin' : (job.job_publisher || '').toLowerCase().includes('indeed') ? 'indeed' : 'jsearch',
          sourceUrl:    job.job_apply_link || job.job_google_link || '#',
          postedAt:     job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : new Date(),
        });
      }
    } catch (err) {
      console.warn(`JSearch "${query}" failed:`, err.message);
    }
  }
  return jobs;
};

// ── Main scrape & save ──
export const scrapeAndSaveJobs = async () => {
  console.log('🔍 Starting Egypt job aggregation...');
  let allJobs = [];

  if (process.env.SERPAPI_KEY) {
    const jobs = await fetchGoogleJobsEgypt(process.env.SERPAPI_KEY);
    allJobs = [...allJobs, ...jobs];
    console.log(`SerpApi: ${jobs.length} jobs`);
  }

  if (process.env.JSEARCH_KEY) {
    const jobs = await fetchJSearchJobs(process.env.JSEARCH_KEY);
    allJobs = [...allJobs, ...jobs];
    console.log(`JSearch: ${jobs.length} jobs`);
  }

  if (allJobs.length === 0) {
    allJobs = egyptianDemoJobs;
    console.log(`Using ${allJobs.length} Egyptian demo jobs`);
  }

  let saved = 0;
  for (const job of allJobs) {
    if (!job.title || !job.company) continue;
    try {
      await prisma.job.upsert({
        where:  { externalId: job.externalId },
        update: { isActive: true, scrapedAt: new Date() },
        create: { ...job, description: job.description || '' },
      });
      saved++;
    } catch {}
  }

  console.log(`✅ Saved ${saved} jobs`);
  return saved;
};

// ── Seed demo data ──
export const seedDemoJobs = async () => {
  let saved = 0;
  for (const job of egyptianDemoJobs) {
    try {
      await prisma.job.upsert({
        where:  { externalId: job.externalId },
        update: {},
        create: job,
      });
      saved++;
    } catch {}
  }
  console.log(`✅ Seeded ${saved} Egyptian jobs`);
  return saved;
};
