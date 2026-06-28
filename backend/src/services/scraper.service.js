import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../utils/prisma.js';

// ── Wuzzuf Scraper (Egypt's top job site) ──
const scrapeWuzzuf = async (page = 1) => {
  const jobs = [];
  try {
    const url = `https://wuzzuf.net/search/jobs/?q=&l=Egypt&page=${page}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);

    $('div[data-jobid]').each((_, el) => {
      const title    = $(el).find('h2 a').text().trim();
      const company  = $(el).find('.css-17s97q8').text().trim();
      const location = $(el).find('.css-5wys0e').first().text().trim();
      const type     = $(el).find('.css-1ve4b75').first().text().trim();
      const href     = $(el).find('h2 a').attr('href');
      const jobId    = $(el).attr('data-jobid');
      const postedAt = $(el).find('time').attr('datetime');

      if (title && company) {
        jobs.push({
          externalId: `wuzzuf-${jobId}`,
          title:      title.substring(0, 255),
          company:    company.substring(0, 255),
          location:   location || 'Egypt',
          type:       type || null,
          description: `${title} at ${company} in ${location}. Posted on Wuzzuf.`,
          requirements: extractKeywords(title),
          source:     'wuzzuf',
          sourceUrl:  href ? `https://wuzzuf.net${href}` : `https://wuzzuf.net/jobs/p/${jobId}`,
          postedAt:   postedAt ? new Date(postedAt) : new Date(),
        });
      }
    });
  } catch (err) {
    console.warn('Wuzzuf scrape failed:', err.message);
  }
  return jobs;
};

// ── LinkedIn Jobs (public) ──
const scrapeLinkedIn = async (keywords = 'software developer') => {
  const jobs = [];
  try {
    const encoded = encodeURIComponent(keywords);
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encoded}&location=Egypt&start=0`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    $('li').each((_, el) => {
      const title   = $(el).find('.base-search-card__title').text().trim();
      const company = $(el).find('.base-search-card__subtitle').text().trim();
      const loc     = $(el).find('.job-search-card__location').text().trim();
      const link    = $(el).find('a').attr('href');
      const jobId   = link?.match(/view\/(\d+)/)?.[1];

      if (title && company && jobId) {
        jobs.push({
          externalId:   `linkedin-${jobId}`,
          title:        title.substring(0, 255),
          company:      company.substring(0, 255),
          location:     loc || 'Egypt',
          description:  `${title} at ${company}. Apply on LinkedIn.`,
          requirements: extractKeywords(title),
          source:       'linkedin',
          sourceUrl:    link || `https://linkedin.com/jobs/view/${jobId}`,
          postedAt:     new Date(),
        });
      }
    });
  } catch (err) {
    console.warn('LinkedIn scrape failed:', err.message);
  }
  return jobs;
};

// ── Adzuna API (if key available) ──
const fetchAdzuna = async () => {
  const jobs = [];
  try {
    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_API_KEY) return jobs;

    const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_API_KEY}&results_per_page=50&what=developer&where=remote`;
    const { data } = await axios.get(url, { timeout: 10000 });

    data.results?.forEach(job => {
      jobs.push({
        externalId:   `adzuna-${job.id}`,
        title:        job.title?.substring(0, 255),
        company:      job.company?.display_name || 'Unknown',
        location:     job.location?.display_name || 'Remote',
        salary:       job.salary_min ? `${job.salary_min} - ${job.salary_max}` : null,
        description:  job.description?.substring(0, 2000),
        requirements: extractKeywords(job.title + ' ' + (job.description || '')),
        source:       'adzuna',
        sourceUrl:    job.redirect_url,
        postedAt:     new Date(job.created),
      });
    });
  } catch (err) {
    console.warn('Adzuna fetch failed:', err.message);
  }
  return jobs;
};

// ── Extract keywords from title/description ──
export const extractKeywords = (text = '') => {
  const techKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
    'Python', 'Django', 'FastAPI', 'Java', 'Spring', 'PHP', 'Laravel', 'Ruby',
    'Go', 'Rust', 'C++', 'C#', '.NET', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Git',
    'REST', 'GraphQL', 'Microservices', 'DevOps', 'CI/CD', 'Figma', 'UI/UX',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch',
    'Selenium', 'Testing', 'Agile', 'Scrum', 'Product Management',
    'Marketing', 'Sales', 'Customer Service', 'Finance', 'Accounting',
    'HR', 'Recruitment', 'Operations', 'Logistics', 'Supply Chain',
  ];

  const found = techKeywords.filter(kw =>
    text.toLowerCase().includes(kw.toLowerCase())
  );

  // Also extract words from title
  const titleWords = text.split(/\s+/).filter(w => w.length > 3);
  return [...new Set([...found, ...titleWords.slice(0, 5)])].slice(0, 15);
};

// ── Main scrape & save ──
export const scrapeAndSaveJobs = async () => {
  console.log('🔍 Starting job scraping...');

  const [wuzzufJobs, linkedInJobs, adzunaJobs] = await Promise.all([
    scrapeWuzzuf(1),
    scrapeLinkedIn('software engineer OR developer OR designer'),
    fetchAdzuna(),
  ]);

  const allJobs = [...wuzzufJobs, ...linkedInJobs, ...adzunaJobs];
  console.log(`Found ${allJobs.length} jobs total`);

  let saved = 0;
  for (const job of allJobs) {
    if (!job.title || !job.company || !job.sourceUrl) continue;
    try {
      await prisma.job.upsert({
        where:  { externalId: job.externalId },
        update: { isActive: true, scrapedAt: new Date() },
        create: job,
      });
      saved++;
    } catch (err) {
      // Skip duplicates or invalid
    }
  }

  console.log(`✅ Saved/updated ${saved} jobs`);
  return saved;
};

// ── Seed demo jobs (for development) ──
export const seedDemoJobs = async () => {
  const demoJobs = [
    {
      externalId: 'demo-1',
      title: 'Senior Frontend Developer',
      company: 'TechCorp Egypt',
      location: 'Cairo, Egypt',
      type: 'Full-time',
      salary: '15,000 - 25,000 EGP',
      description: 'We are looking for a Senior Frontend Developer with strong React and TypeScript skills to join our growing team.',
      requirements: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Git', 'REST'],
      source: 'wuzzuf',
      sourceUrl: 'https://wuzzuf.net',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-2',
      title: 'Python Backend Engineer',
      company: 'Startup Hub',
      location: 'Alexandria, Egypt',
      type: 'Full-time',
      salary: '12,000 - 20,000 EGP',
      description: 'Join our backend team to build scalable APIs using Python and FastAPI.',
      requirements: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'REST', 'SQL'],
      source: 'linkedin',
      sourceUrl: 'https://linkedin.com',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-3',
      title: 'Full Stack Developer',
      company: 'Digital Agency Cairo',
      location: 'Remote',
      type: 'Remote',
      salary: '18,000 - 28,000 EGP',
      description: 'Looking for a full stack developer comfortable with both React and Node.js.',
      requirements: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'Express', 'Git'],
      source: 'wuzzuf',
      sourceUrl: 'https://wuzzuf.net',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-4',
      title: 'UI/UX Designer',
      company: 'Creative Solutions',
      location: 'Cairo, Egypt',
      type: 'Full-time',
      salary: '10,000 - 18,000 EGP',
      description: 'Design beautiful, user-centered digital experiences.',
      requirements: ['Figma', 'UI/UX', 'Adobe XD', 'Prototyping', 'User Research'],
      source: 'indeed',
      sourceUrl: 'https://indeed.com',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-5',
      title: 'DevOps Engineer',
      company: 'CloudTech Egypt',
      location: 'Cairo, Egypt',
      type: 'Full-time',
      salary: '20,000 - 35,000 EGP',
      description: 'Manage cloud infrastructure and CI/CD pipelines.',
      requirements: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Python', 'Terraform'],
      source: 'linkedin',
      sourceUrl: 'https://linkedin.com',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-6',
      title: 'Data Scientist',
      company: 'Analytics Co',
      location: 'Remote',
      type: 'Remote',
      salary: '22,000 - 40,000 EGP',
      description: 'Build ML models and data pipelines to drive business insights.',
      requirements: ['Python', 'Machine Learning', 'TensorFlow', 'Data Science', 'SQL', 'Pandas'],
      source: 'adzuna',
      sourceUrl: 'https://adzuna.com',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-7',
      title: 'Mobile Developer (React Native)',
      company: 'AppFactory',
      location: 'Cairo, Egypt',
      type: 'Full-time',
      salary: '14,000 - 22,000 EGP',
      description: 'Build cross-platform mobile apps with React Native.',
      requirements: ['React Native', 'JavaScript', 'TypeScript', 'iOS', 'Android', 'REST'],
      source: 'wuzzuf',
      sourceUrl: 'https://wuzzuf.net',
      postedAt: new Date(),
    },
    {
      externalId: 'demo-8',
      title: 'QA Engineer',
      company: 'Quality Tech',
      location: 'Giza, Egypt',
      type: 'Full-time',
      salary: '8,000 - 14,000 EGP',
      description: 'Ensure product quality through manual and automated testing.',
      requirements: ['Selenium', 'Testing', 'Python', 'JavaScript', 'Agile', 'Git'],
      source: 'indeed',
      sourceUrl: 'https://indeed.com',
      postedAt: new Date(),
    },
  ];

  for (const job of demoJobs) {
    await prisma.job.upsert({
      where:  { externalId: job.externalId },
      update: {},
      create: job,
    });
  }
  console.log('✅ Demo jobs seeded');
};
