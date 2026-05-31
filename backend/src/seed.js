const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Episode = require('../models/Episode');
const SingleEpisode = require('../models/SingleEpisode');

dotenv.config();

const sampleEpisodes = [
  {
    title: '森林深处的秘密',
    description: '讲述一群兽人在神秘森林中的冒险故事，他们发现了隐藏在古老树木中的秘密，与自然之灵建立了深厚的友谊。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=森林深处的秘密',
    totalEpisodes: 12,
    currentEpisodes: 0,
    status: 'ongoing',
    category: ['冒险', '奇幻'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  },
  {
    title: '城市猎人',
    description: '在现代都市中，兽人们以普通人的身份生活，但当城市面临危机时，他们会挺身而出保护家园。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=城市猎人',
    totalEpisodes: 24,
    currentEpisodes: 0,
    status: 'ongoing',
    category: ['动作', '都市'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  },
  {
    title: '星际旅者',
    description: '一只太空狐狸带领着他的团队在宇宙中探索未知星球，寻找失落的文明。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=星际旅者',
    totalEpisodes: 16,
    currentEpisodes: 0,
    status: 'completed',
    category: ['科幻', '冒险'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  },
  {
    title: '友谊的魔法',
    description: '在魔法学院中，不同种族的兽人们学习控制自己的特殊能力，建立终身难忘的友谊。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=友谊的魔法',
    totalEpisodes: 20,
    currentEpisodes: 0,
    status: 'ongoing',
    category: ['魔法', '校园'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  },
  {
    title: '冬季运动会',
    description: '一年一度的兽人运动会即将开始，各个种族的运动员们齐聚一堂，争夺荣誉。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=冬季运动会',
    totalEpisodes: 8,
    currentEpisodes: 0,
    status: 'completed',
    category: ['运动', '喜剧'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  },
  {
    title: '午夜餐厅',
    description: '一家只在深夜营业的神秘餐厅，主厨是一只技艺高超的狼人，客人们都有着各自的故事。',
    coverImage: 'https://via.placeholder.com/300x400/4a6fa5/ffffff?text=午夜餐厅',
    totalEpisodes: 10,
    currentEpisodes: 0,
    status: 'ongoing',
    category: ['治愈', '美食'],
    platformLinks: { 'bilibili': 'https://www.bilibili.com' }
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');

    await Episode.deleteMany({});
    console.log('已清空剧集数据');

    for (const episodeData of sampleEpisodes) {
      const episode = await Episode.create(episodeData);
      console.log(`创建剧集: ${episode.title}`);

      const singleEpisodes = [];
      for (let i = 1; i <= Math.min(episodeData.totalEpisodes, 5); i++) {
        singleEpisodes.push({
          episodeId: episode._id,
          episodeNumber: i,
          title: `第${i}集`,
          duration: `${20 + Math.floor(Math.random() * 10)}分钟`,
          platformLinks: episodeData.platformLinks,
          views: Math.floor(Math.random() * 1000)
        });
      }

      await SingleEpisode.insertMany(singleEpisodes);
      
      episode.currentEpisodes = singleEpisodes.length;
      await episode.save();
      
      console.log(`  - 已添加${singleEpisodes.length}集`);
    }

    console.log('\n数据种子导入完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据种子导入失败:', error);
    process.exit(1);
  }
};

seedDatabase();