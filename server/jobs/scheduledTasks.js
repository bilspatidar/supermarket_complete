import db from '../../database/connection.js';
import whatsAppService from '../integrations/whatsapp/WhatsAppService.js';

/**
 * Daily Birthday & Anniversary WhatsApp Job
 */
export async function runDailyGreetingsJob() {
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayMMDD = `-${currentMonth}-${currentDay}`;

  console.log(
    `[ScheduledJob] Checking birthdays and anniversaries for date: ${currentMonth}-${currentDay}...`
  );

  let birthdayCount = 0;
  let anniversaryCount = 0;
  let failedCount = 0;

  // Send each notification independently so one failure does not stop the job.
  async function sendGreeting(user, templateKey, deduplicateKey) {
    if (!user.mobile) {
      console.warn(
        `[ScheduledJob] Skipping ${templateKey} for user ${user.id}: mobile missing`
      );
      return false;
    }

    try {
      const result = await whatsAppService.send({
        recipient: user.mobile,
        templateKey,
        variables: {
          customer_name: user.name || 'Customer',
          // WhatsAppService should populate store_name if it is missing.
        },
        userId: user.id,
        deduplicateKey,
      });

      console.log(
        `[ScheduledJob] ${templateKey} accepted for user ${user.id}:`,
        result.messageId
      );

      return true;
    } catch (err) {
      // Duplicates should not stop other users from receiving greetings.
      if (err.message?.includes('Duplicate WhatsApp notification')) {
        console.log(
          `[ScheduledJob] Skipping duplicate ${templateKey} for user ${user.id}`
        );
        return false;
      }

      failedCount++;

      console.error(
        `[ScheduledJob] Failed ${templateKey} for user ${user.id}:`,
        err.message
      );

      return false;
    }
  }

  try {
    // 1. Birthday greetings
    const birthdayUsers = await db.query(
      `SELECT id, name, mobile, dob
       FROM users
       WHERE status = 'ACTIVE'
         AND dob IS NOT NULL
         AND dob LIKE ?`,
      [`%${todayMMDD}`]
    );

    for (const user of birthdayUsers) {
      const sent = await sendGreeting(
        user,
        'greeting.birthday',
        `birthday-${user.id}-${currentMonth}-${currentDay}`
      );

      if (sent) birthdayCount++;
    }

    // 2. Anniversary greetings
    const annivUsers = await db.query(
      `SELECT id, name, mobile, anniversary_date
       FROM users
       WHERE status = 'ACTIVE'
         AND anniversary_date IS NOT NULL
         AND anniversary_date LIKE ?`,
      [`%${todayMMDD}`]
    );

    for (const user of annivUsers) {
      const sent = await sendGreeting(
        user,
        'greeting.anniversary',
        `anniversary-${user.id}-${currentMonth}-${currentDay}`
      );

      if (sent) anniversaryCount++;
    }

    console.log(
      `[ScheduledJob] Greetings job completed. ` +
      `Birthdays accepted: ${birthdayCount}, ` +
      `Anniversaries accepted: ${anniversaryCount}, ` +
      `Failures: ${failedCount}.`
    );
  } catch (err) {
    console.error(
      '[ScheduledJob] Could not complete daily greetings job:',
      err.message
    );
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
