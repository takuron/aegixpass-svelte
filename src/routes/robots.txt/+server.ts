// src/routes/robots.txt/+server.ts

import type { RequestHandler } from '@sveltejs/kit';
import {SITE_URL} from "$lib/constants";

export const prerender = true;

export const GET: RequestHandler = () => {
    const body = `User-agent: *
Disallow:

Sitemap: ${SITE_URL}/sitemap.xml`;

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain'
        }
    });
};