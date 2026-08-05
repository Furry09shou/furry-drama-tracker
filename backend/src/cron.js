const User = require('../models/User');
const Episode = require('../models/Episode');
const cleanupUser = require('../utils/userCleanup');

// 过期账号注销：用户申请注销后给 7 天宽限期，到期物理删除
const checkExpiredAccountDeletion = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersToDelete = await User.find({
      deletionRequestedAt: { $ne: null, $lte: sevenDaysAgo }
    });
    for (const user of usersToDelete) {
      await cleanupUser(user._id);
      console.log(`[Cron] Deleted expired user: ${user._id}`);
    }
  } catch (error) {
    console.error('[Cron] checkExpiredAccountDeletion error:', error.message);
  }
};

// 自动完结：连载剧的 currentEpisodes 已达到 totalEpisodes 时标记为已完结
const checkAutoComplete = async () => {
  try {
    const episodes = await Episode.find({ status: 'ongoing' });
    let updated = 0;
    for (const ep of episodes) {
      if (ep.currentEpisodes > 0 && ep.totalEpisodes > 0 && ep.currentEpisodes >= ep.totalEpisodes) {
        ep.status = 'completed';
        await ep.save();
        updated++;
      }
    }
    if (updated > 0) {
      console.log(`[Cron] Auto-completed ${updated} episodes`);
    }
  } catch (error) {
    console.error('[Cron] checkAutoComplete error:', error.message);
  }
};

// 注意：首播提醒定时任务(checkPremiereReleases)已移除。
// 原因：自动按 premiereDate 转正预告集存在风险——若作者未按规定时间更新，
// 系统仍会自动把预告集转为可观看集，导致进度与通知与实际内容不符。
// 现改为完全手动：作者在单集管理中编辑预告集、取消"设为预告"勾选即可转正，
// 转正逻辑见 routes/episodes.js 的 PUT /single/:id（becameAvailable 分支）：
//   currentEpisodes +1，并向追番用户发送站内通知 + Web Push + 邮件。

const startCronJobs = () => {
  setInterval(checkExpiredAccountDeletion, 6 * 60 * 60 * 1000);
  setInterval(checkAutoComplete, 60 * 60 * 1000);
  console.log('[Cron] Cron jobs started');
};

module.exports = { startCronJobs };
