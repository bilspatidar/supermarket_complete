import db from '../../database/connection.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';

/**
 * Daily Birthday & Anniversary WhatsApp Job
 */
export async function runDailyGreetingsJob() {
  try {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentDay = String(now.getDate()).padStart(2, '0');
    const todayMMDD = `-${currentMonth}-${currentDay}`; // matches %-MM-DD

    console.log(`[ScheduledJob] Checking birthdays and anniversaries for date: ${currentMonth}-${currentDay}...`);

    // 1. Birthday Check
    const birthdayUsers = await db.query(
      `SELECT id, name, mobile, dob FROM users 
       WHERE status = 'ACTIVE' AND dob IS NOT NULL AND dob LIKE ?`,
      [`%${todayMMDD}`]
    );

    for (const user of birthdayUsers) {
      await whatsAppService.send({
        recipient: user.mobile,
        templateKey: 'greeting.birthday',
        variables: { customer_name: user.name },
        userId: user.id,
        deduplicateKey: `birthday-${user.id}-${todayMMDD}`,
      });
    }

    // 2. Anniversary Check
    const annivUsers = await db.query(
      `SELECT id, name, mobile, anniversary_date FROM users 
       WHERE status = 'ACTIVE' AND anniversary_date IS NOT NULL AND anniversary_date LIKE ?`,
      [`%${todayMMDD}`]
    );

    for (const user of annivUsers) {
      await whatsAppService.send({
        recipient: user.mobile,
        templateKey: 'greeting.anniversary',
        variables: { customer_name: user.name },
        userId: user.id,
        deduplicateKey: `anniversary-${user.id}-${todayMMDD}`,
      });
    }

    console.log(`[ScheduledJob] Processed ${birthdayUsers.length} birthdays and ${annivUsers.length} anniversaries.`);
  } catch (err) {
    console.error('[ScheduledJob] Error in daily greetings job:', err.message);
  }
}

/**
 * Initialize background interval scheduler
 */
export function initScheduledTasks() {
  // Run once shortly after startup
  setTimeout(() => {
    runDailyGreetingsJob();
  }, 10000);

  // Run every 12 hours
  setInterval(() => {
    runDailyGreetingsJob();
  }, 12 * 60 * 60 * 1000);
}

export default {
  runDailyGreetingsJob,
  initScheduledTasks,
};
