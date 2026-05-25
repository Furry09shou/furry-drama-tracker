const User = require('../models/User');
const Follow = require('../models/Follow');
const History = require('../models/History');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const UserSession = require('../models/UserSession');
const Episode = require('../models/Episode');

const cleanupUser = async (userId) => {
  const userRatings = await Rating.find({ userId });

  await Follow.deleteMany({ userId });
  await History.deleteMany({ userId });
  await Notification.deleteMany({ userId });
  await Favorite.deleteMany({ userId });
  await Report.deleteMany({ reporterId: userId });
  await Feedback.deleteMany({ userId });
  await UserSession.deleteMany({ userId });
  await Rating.deleteMany({ userId });

  for (const r of userRatings) {
    const stats = await Rating.aggregate([
      { $match: { episodeId: r.episodeId } },
      { $group: { _id: '$episodeId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    if (stats.length > 0) {
      await Episode.findByIdAndUpdate(r.episodeId, {
        averageRating: Math.round(stats[0].avg * 10) / 10,
        ratingCount: stats[0].count
      });
    } else {
      await Episode.findByIdAndUpdate(r.episodeId, {
        averageRating: 0,
        ratingCount: 0
      });
    }
  }

  const deletedUser = await User.findByIdAndDelete(userId);

  return {
    deletedUser,
    ratingsRecalculated: userRatings.length
  };
};

module.exports = cleanupUser;
