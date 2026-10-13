
import type { FastifyRequest, FastifyReply } from "fastify"
import type { CircuitOptions } from "./circuit-renderer";
import { fetchContributions } from "./github";
import { generateGif, generatePng, generateSvg } from "./image-encoder";




export default async function handleImageRequest(req: FastifyRequest, reply: FastifyReply, defaultFormat: string | null = null) {
    const query = (req.query || {}) as Record<string, string>;
    const params = (req.params || {}) as Record<string, string>;

    let user = params.user || query.user || query.username || 'octocat';
    user = user.replace(/^@/, '');

    let format = defaultFormat;
    const match = user.match(/^([a-zA-Z0-9-_]+)\.(gif|png|svg)$/i);
    if (match) {
        user = match[1];
        format = match[2].toLowerCase();
    }

    if (!format) {
        format = (query.format || 'png').toLowerCase();
    }

    const year = query.year || 'last';
    const theme = query.theme || 'breadboard';
    const wireMode = query.wireMode || query.wire || 'hybrid';
    const nodeStyle = query.nodeStyle || query.node || 'led';
    const density = query.density || '2';
    const glow = query.glow ?? '70';
    const wireColors = query.wireColors || query.wires || '';
    const speed = query.speed || 'normal';
    const frames = query.frames || '10';
    const scale = query.scale || '1';
    const showStats = query.stats !== '0' && query.stats !== 'false';
    const showMonths = query.months !== '0' && query.months !== 'false';
    const showDays = query.days !== '0' && query.days !== 'false';
    const showLegend = query.legend !== '0' && query.legend !== 'false';
    const showChip = query.chip !== '0' && query.chip !== 'false';
    const animate = query.animate !== '0' && query.animate !== 'false';

    const renderOptions: CircuitOptions = {
        username: user,
        year,
        theme,
        wireMode,
        nodeStyle,
        density,
        glow,
        wireColors,
        speed,
        frames,
        scale,
        showStats,
        showMonths,
        showDays,
        showLegend,
        showChip,
        animate,
        color: query.color,
        accent: query.accent,
        bg: query.bg,
        boardBg: query.boardBg
    };

    try {
        const data = await fetchContributions(user, year);
        const days = data.contributions;

        // GitHub Camo & CDN Cache Headers
        reply.header('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');

        if (format === 'gif') {
            reply.header('Content-Type', 'image/gif');
            const buffer = await generateGif(days, renderOptions);
            return reply.send(buffer);
        } else if (format === 'svg') {
            reply.header('Content-Type', 'image/svg+xml; charset=utf-8');
            const svg = generateSvg(days, renderOptions);
            return reply.send(svg);
        } else {
            // Default: PNG
            reply.header('Content-Type', 'image/png');
            const buffer = await generatePng(days, renderOptions);
            return reply.send(buffer);
        }
    } catch (err: any) {
        req.log.error(err);
        reply.status(500).type('text/plain').send(`Error generating circuit: ${err.message}`);
    }
}