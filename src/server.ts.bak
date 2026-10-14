/**
 * Fastify Web Server for Commit Circuit.
 * Written in TypeScript (ESM) for Bun.
 * Inbuilt direct GitHub scraper from nishur31/github-contributions-api.
 */

import handleImageRequest from './imageHandler.ts';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';

import { fetchContributions } from './github.ts';
import { generatePng, generateGif, generateSvg, imageCache } from './image-encoder.ts';
import { THEMES } from './themes.ts';
import type { CircuitOptions } from './circuit-renderer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    }
  });

  // Enable CORS
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'HEAD', 'OPTIONS']
  });

  // Serve static assets from public/ directory
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/public/'
  });

  // ==========================================
  // 1. Homepage & Web Workbench
  // ==========================================
  app.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.type('text/html');
    const indexPath = path.join(publicDir, 'index.html');
    return fs.readFileSync(indexPath, 'utf8');
  });

  // ==========================================
  // 2. Telemetry and Data Endpoints
  // ==========================================
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      engine: 'bun',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cachedImages: imageCache.size,
      themes: Object.keys(THEMES)
    };
  });

  app.get('/api/themes', async () => {
    return {
      themes: THEMES
    };
  });

  app.get('/api/data', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query || {}) as Record<string, string>;
    const user = (query.user || query.username || 'octocat').replace(/^@/, '');
    const year = query.year || 'last';

    try {
      const data = await fetchContributions(user, year);
      reply.header('Cache-Control', 'public, max-age=600');
      return {
        user,
        year,
        total: data.total,
        stats: data.stats,
        fromCache: data.fromCache,
        isFallback: data.isFallback || false,
        contributions: data.contributions
      };
    } catch (err: any) {
      reply.status(500);
      return { error: err.message };
    }
  });

  // ==========================================
  app.get('/api/circuit.gif', (req, rep) => handleImageRequest(req, rep, 'gif'));
  app.get('/api/circuit.png', (req, rep) => handleImageRequest(req, rep, 'png'));
  app.get('/api/circuit.svg', (req, rep) => handleImageRequest(req, rep, 'svg'));

  app.get('/circuit.gif', (req, rep) => handleImageRequest(req, rep, 'gif'));
  app.get('/circuit.png', (req, rep) => handleImageRequest(req, rep, 'png'));
  app.get('/circuit.svg', (req, rep) => handleImageRequest(req, rep, 'svg'));

  app.get('/api/circuit', (req, rep) => handleImageRequest(req, rep));
  app.get('/circuit', (req, rep) => handleImageRequest(req, rep));

  app.get('/:user.gif', (req, rep) => handleImageRequest(req, rep, 'gif'));
  app.get('/:user.png', (req, rep) => handleImageRequest(req, rep, 'png'));
  app.get('/:user.svg', (req, rep) => handleImageRequest(req, rep, 'svg'));

  app.get('/api/:user.gif', (req, rep) => handleImageRequest(req, rep, 'gif'));
  app.get('/api/:user.png', (req, rep) => handleImageRequest(req, rep, 'png'));
  app.get('/api/:user.svg', (req, rep) => handleImageRequest(req, rep, 'svg'));

  return app;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: HOST });
    console.log(`\n⚡ Commit Circuit Bun + Fastify Server is running!`);
    console.log(`> Interactive Workbench:  http://localhost:${PORT}/`);
    console.log(`> Sample Animated GIF:    http://localhost:${PORT}/octocat.gif`);
    console.log(`> Sample Crisp PNG:       http://localhost:${PORT}/octocat.png`);
    console.log(`> Sample Vector SVG:      http://localhost:${PORT}/octocat.svg`);
    console.log(`> API Endpoint:           http://localhost:${PORT}/api/circuit?user=torvalds&format=gif&theme=breadboard\n`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

export default start;