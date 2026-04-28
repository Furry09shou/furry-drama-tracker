# 兽剧聚合平台 API 文档

## 认证相关 API

### 注册
- **路径**: `/api/auth/register`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "邮箱",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "_id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "token": "JWT令牌"
  }
  ```

### 登录
- **路径**: `/api/auth/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "email": "邮箱",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "_id": "用户ID",
    "username": "用户名",
    "email": "邮箱",
    "token": "JWT令牌"
  }
  ```

## 剧集相关 API

### 获取所有剧集
- **路径**: `/api/episodes`
- **方法**: `GET`
- **查询参数**:
  - `category`: 分类筛选
  - `sort`: 排序方式 (`latest` 或 `views`)
- **响应**:
  ```json
  [
    {
      "_id": "剧集ID",
      "title": "剧集标题",
      "description": "剧集描述",
      "coverImage": "封面图URL",
      "totalEpisodes": 总集数,
      "currentEpisodes": 当前集数,
      "status": "状态",
      "category": ["分类1", "分类2"],
      "views": 浏览量
    }
  ]
  ```

### 获取单个剧集详情
- **路径**: `/api/episodes/:id`
- **方法**: `GET`
- **响应**:
  ```json
  {
    "_id": "剧集ID",
    "title": "剧集标题",
    "description": "剧集描述",
    "coverImage": "封面图URL",
    "totalEpisodes": 总集数,
    "currentEpisodes": 当前集数,
    "status": "状态",
    "category": ["分类1", "分类2"],
    "views": 浏览量,
    "episodes": [
      {
        "_id": "单集ID",
        "episodeNumber": 集数,
        "title": "单集标题",
        "duration": "时长",
        "views": 浏览量
      }
    ]
  }
  ```

### 增加剧集点击量
- **路径**: `/api/episodes/:id/view`
- **方法**: `PUT`
- **响应**:
  ```json
  {
    "_id": "剧集ID",
    "views": 更新后的浏览量
  }
  ```

### 增加单集点击量
- **路径**: `/api/episodes/single/:id/view`
- **方法**: `PUT`
- **响应**:
  ```json
  {
    "_id": "单集ID",
    "views": 更新后的浏览量
  }
  ```

## 追番相关 API

### 添加追番
- **路径**: `/api/follows/add`
- **方法**: `POST`
- **请求头**:
  - `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "episodeId": "剧集ID"
  }
  ```
- **响应**:
  ```json
  {
    "_id": "追番记录ID",
    "userId": "用户ID",
    "episodeId": "剧集ID",
    "watchedEpisodes": [],
    "createdAt": "创建时间"
  }
  ```

### 取消追番
- **路径**: `/api/follows/remove`
- **方法**: `POST`
- **请求头**:
  - `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "episodeId": "剧集ID"
  }
  ```
- **响应**:
  ```json
  {
    "message": "Unfollowed successfully"
  }
  ```

### 获取用户的追番列表
- **路径**: `/api/follows/list`
- **方法**: `GET`
- **请求头**:
  - `Authorization: Bearer {token}`
- **响应**:
  ```json
  [
    {
      "_id": "追番记录ID",
      "userId": "用户ID",
      "episodeId": {
        "_id": "剧集ID",
        "title": "剧集标题",
        "coverImage": "封面图URL",
        "totalEpisodes": 总集数,
        "currentEpisodes": 当前集数
      },
      "watchedEpisodes": [1, 2, 3],
      "lastWatched": "最后观看时间",
      "createdAt": "创建时间"
    }
  ]
  ```

### 更新观看进度
- **路径**: `/api/follows/progress`
- **方法**: `PUT`
- **请求头**:
  - `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "episodeId": "剧集ID",
    "episodeNumber": 集数
  }
  ```
- **响应**:
  ```json
  {
    "_id": "追番记录ID",
    "watchedEpisodes": [1, 2, 3, 4],
    "lastWatched": "更新后的最后观看时间"
  }
  ```

## 未来扩展 API

### 评论系统
- **路径**: `/api/comments`
- **方法**: `GET`, `POST`, `PUT`, `DELETE`

### 社区互动
- **路径**: `/api/community`
- **方法**: `GET`, `POST`

### 推荐系统
- **路径**: `/api/recommendations`
- **方法**: `GET`

### 搜索功能
- **路径**: `/api/search`
- **方法**: `GET`