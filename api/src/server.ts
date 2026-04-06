import 'dotenv/config';
import { app } from './app.js';
import { startDailyReminderScheduler } from './modules/reminders/dailyReminder.job.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: /health`);
  startDailyReminderScheduler();
});