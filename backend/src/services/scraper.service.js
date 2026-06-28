import axios from 'axios';
import { prisma } from '../utils/prisma.js';

// ── Extract keywords from title ──
export const extractKeywords = (text = '') => {
  const techKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
    'Python', 'Django', 'FastAPI', 'Java', 'Spring', 'PHP', 'Laravel',
    'Go', 'C++', 'C#', '.NET', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
    'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Linux', 'Git',
    'REST', 'GraphQL', 'Microservices', 'DevOps', 'CI/CD', 'Figma', 'UI/UX',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'Flutter', 'Swift',
    'React Native', 'Android', 'iOS', 'Selenium', 'Testing', 'Agile', 'Scrum',
    'Marketing', 'Sales', 'Customer Service', 'Finance', 'Accounting',
    'HR', 'Recruitment', 'Operations', 'Logistics', 'Supply Chain',
    'Graphic Design', 'Adobe', 'Photoshop', 'Illustrator', 'Content Writing',
    'SEO', 'Social Media', 'Digital Marketing', 'Business Development',
  ];
  const found = techKeywords.filter(kw =>
    text.toLowerCase().includes(kw.toLowerCase())
  );
  const titleWords = text.split(/[\s,\/\-]+/).filter(w => w.length > 3 && w.length < 20);
  return [...new Set([...found, ...titleWords.slice(0, 5)])].slice(0, 15);
};

// ── SerpApi - Google Jobs (بيجيب من وظف وفرصنا وLinkedIn وكل المواقع) ──
const fetchGoogleJobsEgypt = async (query = 'وظائف مصر', apiKey) => {
  const jobs = [];
  try {
    const searches = [
      { q: 'jobs in Egypt', location: 'Egypt' },
      { q: 'وظائف القاهرة', location: 'Cairo, Egypt' },
      { q: 'software developer Egypt', location: 'Egypt' },
      { q: 'marketing jobs Egypt', location: 'Egypt' },
      { q: 'engineering jobs Cairo', location: 'Cairo, Egypt' },
    ];

    for (const search of searches) {
      try {
        const { data } = await axios.get('https://serpapi.com/search', {
          params: {
            engine:   'google_jobs',
            q:        search.q,
            location: search.location,
            hl:       'en',
            api_key:  apiKey,
          },
          timeout: 15000,
        });

        const results = data.jobs_results || [];
        for (const job of results) {
          const source = job.via?.replace('via ', '') || 'Google Jobs';
          jobs.push({
            externalId:   `serpapi-${Buffer.from(job.title + job.company_name).toString('base64').substring(0, 40)}`,
            title:        job.title?.substring(0, 255),
            company:      job.company_name?.substring(0, 255) || 'Unknown',
            location:     job.location || 'Egypt',
            type:         job.detected_extensions?.schedule_type || null,
            salary:       job.detected_extensions?.salary || null,
            description:  job.description?.substring(0, 2000) || '',
            requirements: extractKeywords(job.title + ' ' + (job.description || '')),
            source:       source.toLowerCase().includes('wuzzuf') ? 'wuzzuf' :
                         source.toLowerCase().includes('forasna') ? 'forasna' :
                         source.toLowerCase().includes('linkedin') ? 'linkedin' :
                         source.toLowerCase().includes('indeed') ? 'indeed' :
                         source.toLowerCase() || 'google_jobs',
            sourceUrl:    job.related_links?.[0]?.link || job.share_link || 'https://www.google.com/search?q=jobs',
            postedAt:     job.detected_extensions?.posted_at ? new Date() : new Date(),
          });
        }
      } catch (err) {
        console.warn(`Search "${search.q}" failed:`, err.message);
      }
    }
  } catch (err) {
    console.warn('SerpApi failed:', err.message);
  }
  return jobs;
};

// ── JSearch API (RapidAPI) - LinkedIn, Indeed, Glassdoor ──
const fetchJSearchJobs = async (apiKey) => {
  const jobs = [];
  try {
    const queries = [
      'jobs in Egypt',
      'remote jobs Egypt',
      'software engineer Cairo',
    ];

    for (const query of queries) {
      try {
        const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
          params: { query, page: '1', num_pages: '2', country: 'eg' },
          headers: {
            'X-RapidAPI-Key':  apiKey,
            'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
          },
          timeout: 15000,
        });

        for (const job of (data.data || [])) {
          jobs.push({
            externalId:   `jsearch-${job.job_id}`,
            title:        job.job_title?.substring(0, 255),
            company:      job.employer_name?.substring(0, 255) || 'Unknown',
            location:     job.job_city ? `${job.job_city}, Egypt` : (job.job_country || 'Egypt'),
            type:         job.job_employment_type || null,
            salary:       job.job_min_salary ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency || 'USD'}` : null,
            description:  job.job_description?.substring(0, 2000) || '',
            requirements: extractKeywords(job.job_title + ' ' + (job.job_description || '')),
            source:       job.job_publisher?.toLowerCase().includes('linkedin') ? 'linkedin' :
                         job.job_publisher?.toLowerCase().includes('indeed') ? 'indeed' :
                         job.job_publisher?.toLowerCase() || 'jsearch',
            sourceUrl:    job.job_apply_link || job.job_google_link || '#',
            postedAt:     job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc) : new Date(),
          });
        }
      } catch (err) {
        console.warn(`JSearch query "${query}" failed:`, err.message);
      }
    }
  } catch (err) {
    console.warn('JSearch failed:', err.message);
  }
  return jobs;
};

// ── Demo jobs (fallback when no API keys) ──
const getDemoJobs = () => [
  {
    externalId: 'demo-eg-1',
    title: 'Senior Frontend Developer',
    company: 'Instabug',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '25,000 - 40,000 EGP',
    description: 'Join Instabug as a Senior Frontend Developer. Work with React, TypeScript, and modern web technologies.',
    requirements: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Git', 'REST'],
    source: 'wuzzuf',
    sourceUrl: 'https://wuzzuf.net',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-2',
    title: 'Backend Engineer - Python',
    company: 'Breadfast',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '20,000 - 35,000 EGP',
    description: 'Build scalable backend services with Python, FastAPI and PostgreSQL.',
    requirements: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'SQL'],
    source: 'linkedin',
    sourceUrl: 'https://linkedin.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-3',
    title: 'Full Stack Developer',
    company: 'Paymob',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '22,000 - 38,000 EGP',
    description: 'Full stack development using React and Node.js for Egypt\'s leading fintech.',
    requirements: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'Express'],
    source: 'wuzzuf',
    sourceUrl: 'https://wuzzuf.net',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-4',
    title: 'UI/UX Designer',
    company: 'Swvl',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '15,000 - 25,000 EGP',
    description: 'Design beautiful user experiences for millions of users across Egypt and Africa.',
    requirements: ['Figma', 'UI/UX', 'Adobe XD', 'Prototyping', 'User Research'],
    source: 'forasna',
    sourceUrl: 'https://forasna.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-5',
    title: 'DevOps Engineer',
    company: 'Fawry',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '30,000 - 50,000 EGP',
    description: 'Manage cloud infrastructure for Egypt\'s largest fintech platform.',
    requirements: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Terraform'],
    source: 'linkedin',
    sourceUrl: 'https://linkedin.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-6',
    title: 'Data Scientist',
    company: 'Elmenus',
    location: 'Remote, Egypt',
    type: 'Remote',
    salary: '25,000 - 45,000 EGP',
    description: 'Build ML models to personalize food recommendations for millions of users.',
    requirements: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Pandas', 'Data Science'],
    source: 'wuzzuf',
    sourceUrl: 'https://wuzzuf.net',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-7',
    title: 'Mobile Developer - Flutter',
    company: 'MaxAB',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '18,000 - 30,000 EGP',
    description: 'Build cross-platform mobile apps with Flutter for B2B e-commerce.',
    requirements: ['Flutter', 'Dart', 'iOS', 'Android', 'REST', 'Firebase'],
    source: 'forasna',
    sourceUrl: 'https://forasna.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-8',
    title: 'Digital Marketing Specialist',
    company: 'Noon',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '12,000 - 20,000 EGP',
    description: 'Drive digital marketing campaigns for the Middle East\'s leading e-commerce platform.',
    requirements: ['SEO', 'Social Media', 'Digital Marketing', 'Google Ads', 'Analytics'],
    source: 'wuzzuf',
    sourceUrl: 'https://wuzzuf.net',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-9',
    title: 'Product Manager',
    company: 'Cartona',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '25,000 - 40,000 EGP',
    description: 'Lead product strategy for Egypt\'s fastest growing B2B marketplace.',
    requirements: ['Product Management', 'Agile', 'Scrum', 'Analytics', 'SQL'],
    source: 'linkedin',
    sourceUrl: 'https://linkedin.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-10',
    title: 'Cybersecurity Engineer',
    company: 'Kaspersky Egypt',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '30,000 - 55,000 EGP',
    description: 'Protect enterprise clients from cyber threats across the MENA region.',
    requirements: ['Cybersecurity', 'Linux', 'Python', 'Networking', 'SIEM', 'Penetration Testing'],
    source: 'forasna',
    sourceUrl: 'https://forasna.com',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-11',
    title: 'Accountant',
    company: 'Talabat Egypt',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '8,000 - 14,000 EGP',
    description: 'Handle financial reporting and accounting for Egypt operations.',
    requirements: ['Accounting', 'Finance', 'Excel', 'ERP', 'Tax'],
    source: 'wuzzuf',
    sourceUrl: 'https://wuzzuf.net',
    postedAt: new Date(),
  },
  {
    externalId: 'demo-eg-12',
    title: 'HR Specialist',
    company: 'Vodafone Egypt',
    location: 'Cairo, Egypt',
    type: 'Full-time',
    salary: '10,000 - 18,000 EGP',
    description: 'Manage recruitment and HR operations for one of Egypt\'s largest telecoms.',
    requirements: ['HR', 'Recruitment', 'Excel', 'Communication', 'Labor Law'],
    source: 'linkedin',
    sourceUrl: 'https://linkedin.com',
    postedAt: new Date(),
  },
];

// ── Main scrape function ──
export const scrapeAndSaveJobs = async () => {
  console.log('🔍 Starting Egypt job aggregation...');

  const serpApiKey  = process.env.SERPAPI_KEY;
  const jSearchKey  = process.env.JSEARCH_KEY;

  let allJobs = [];

  // Try SerpApi first (best for Egyptian sites)
  if (serpApiKey) {
    console.log('Using SerpApi (Google Jobs)...');
    const serpJobs = await fetchGoogleJobsEgypt('jobs egypt', serpApiKey);
    allJobs = [...allJobs, ...serpJobs];
    console.log(`SerpApi: ${serpJobs.length} jobs`);
  }

  // Try JSearch (LinkedIn, Indeed)
  if (jSearchKey) {
    console.log('Using JSearch API...');
    const jJobs = await fetchJSearchJobs(jSearchKey);
    allJobs = [...allJobs, ...jJobs];
    console.log(`JSearch: ${jJobs.length} jobs`);
  }

  // Fallback to demo jobs
  if (allJobs.length === 0) {
    console.log('No API keys found, using demo Egyptian jobs...');
    allJobs = getDemoJobs();
  }

  // Save to DB
  let saved = 0;
  for (const job of allJobs) {
    if (!job.title || !job.company) continue;
    try {
      await prisma.job.upsert({
        where:  { externalId: job.externalId },
        update: { isActive: true, scrapedAt: new Date(), description: job.description || '' },
        create: { ...job, description: job.description || '' },
      });
      saved++;
    } catch (err) {
      // Skip duplicates
    }
  }

  console.log(`✅ Saved ${saved} Egyptian jobs`);
  return saved;
};

// ── Seed demo data ──
export const seedDemoJobs = async () => {
  const demoJobs = getDemoJobs();
  for (const job of demoJobs) {
    await prisma.job.upsert({
      where:  { externalId: job.externalId },
      update: {},
      create: job,
    });
  }
  console.log('✅ Egyptian demo jobs seeded');
};
