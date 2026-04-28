const express = require('express');
const path = require('path');
const connectDB = require('../config/db');
const cors = require('cors');
const authRoutes = require('../routes/auth');
const episodeRoutes = require('../routes/episodes');
const followRoutes = require('../routes/follows');
const historyRoutes = require('../routes/histories');
const notificationRoutes = require('../routes/notifications');
const adminRoutes = require('../routes/admin');
const categoryRoutes = require('../routes/categories');
const bannerRoutes = require('../routes/banners');
const creatorRoutes = require('../routes/creator');
const reviewRoutes = require('../routes/review');
const creatorProfileRoutes = require('../routes/creatorProfiles');
const siteContentRoutes = require('../routes/siteContent');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/histories', historyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/creator-profile', creatorProfileRoutes);
app.use('/api/site-content', siteContentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
