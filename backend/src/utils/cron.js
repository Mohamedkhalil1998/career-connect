import cron from 'node-cron';
import { scrapeAndSaveJobs } from '../services/scraper.service.js';

export const startCronJobs = () => {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Cron: Starting scheduled job scraping...');
    try {
      const count = await scrapeAndSaveJobs();
      console.log(`⏰ Cron: Scraped ${count} jobs`);
    } catch (err) {
      console.error('⏰ Cron error:', err.message);
    }
  });

  console.log('⏰ Cron jobs started (every 6 hours)');
};
