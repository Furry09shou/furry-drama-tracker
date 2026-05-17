const User = require('../models/User');
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');

const checkExpiredAccountDeletion = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersToDelete = await User.find({
      deletionRequestedAt: { $ne: null, $lte: sevenDaysAgo }
    });
    for (const user of usersToDelete) {
      const Follow = require('../models/Follow');
      const History = require('../models/History');
      const Notification = require('../models/Notification');
      const Favorite = require('../models/Favorite');
      const Rating = require('../models/Rating');
      const UserSession = require('../models/UserSession');
      await Follow.deleteMany({ userId: user._id });
      await History.deleteMany({ userId: user._id });
      await Notification.deleteMany({ userId: user._id });
      await Favorite.deleteMany({ userId: user._id });
      await Rating.deleteMany({ userId: user._id });
      await UserSession.deleteMany({ userId: user._id });
      await User.findByIdAndDelete(user._id);
      console.log(`[Cron] Deleted expired user: ${user._id}`);
    }
  } catch (error) {
    console.error('[Cron] checkExpiredAccountDeletion error:', error.message);
  }
};

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

const checkPremiereReleases = async () => {
  try {
    const now = new Date();
    const upcomingSingles = await SingleEpisode.find({
      isUpcoming: true,
      premiereDate: { $lte: now }
    });
    let released = 0;
    for (const se of upcomingSingles) {
      se.isUpcoming = false;
      se.releaseDate = se.premiereDate;
      await se.save();
      released++;
    }
    if (released > 0) {
      console.log(`[Cron] Released ${released} premiere singles`);
    }
  } catch (error) {
    console.error('[Cron] checkPremiereReleases error:', error.message);
  }
};

const startCronJobs = () => {
  setInterval(checkExpiredAccountDeletion, 6 * 60 * 60 * 1000);
  setInterval(checkAutoComplete, 60 * 60 * 1000);
  setInterval(checkPremiereReleases, 30 * 60 * 1000);
  console.log('[Cron] Cron jobs started');
};

module.exports = { startCronJobs };
