import type { APIRoute } from 'astro';
import { buildIndex, jsonResponse } from '~/lib/search';

export const GET: APIRoute = async () => jsonResponse(await buildIndex('en'));
