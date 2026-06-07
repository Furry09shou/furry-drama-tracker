const mongoose = require('mongoose');
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
const PushSubscription = require('../models/PushSubscription');
const Folder = require('../models/Folder');

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
  await PushSubscription.deleteMany({ userId });
  await Folder.deleteMany({ userId });

  // 批量重算受影响剧集的评分
  const affectedEpisodeIds = [...new Set(userRatings.map(r => r.episodeId.toString()))];
  if (affectedEpisodeIds.length > 0) {
    const stats = await Rating.aggregate([
      { $match: { episodeId: { $in: affectedEpisodeIds.map(id => mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$episodeId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
    ]);
    const statsMap = {};
    stats.forEach(s => { statsMap[s._id.toString()] = s; });
    const bulkOps = affectedEpisodeIds.map(epId => {
      const stat = statsMap[epId];
      return {
        updateOne: {
          filter: { _id: epId },
          update: {
            averageRating: stat ? Math.round(stat.avg * 10) / 10 : 0,
            ratingCount: stat ? stat.count : 0
          }
        }
      };
    });
    await Episode.bulkWrite(bulkOps);
  }

  const deletedUser = await User.findByIdAndDelete(userId);
  return { deletedUser, ratingsRecalculated: userRatings.length };
};

module.exports = cleanupUser;
