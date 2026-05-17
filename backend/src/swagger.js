const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '兽剧内容聚合平台 API',
      version: '1.0.0',
      description: '兽剧内容聚合平台后端服务 API 文档',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: '本地开发服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '输入JWT令牌（不含Bearer前缀）',
        },
      },
    },
    security: [],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
