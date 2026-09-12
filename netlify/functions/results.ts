import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validSession } from './_shared/auth.js';

const store = getStore({ name: 'aylan-results', consistency: 'strong' });

function clean(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export default async (request: Request) => {
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return Response.json({ ok: false, error: 'Données invalides.' }, { status: 400 });
    const data = body as Record<string, unknown>;
    const result = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      skill: clean(data.skill, 50),
      subject: clean(data.subject, 30),
      question: clean(data.question, 300),
      answer: clean(data.answer, 100),
      correctAnswer: clean(data.correctAnswer, 100),
      correct: data.correct === true,
      difficulty: Math.max(1, Math.min(4, Number(data.difficulty) || 1))
    };
    if (!result.skill || !result.question) return Response.json({ ok: false, error: 'Compétence ou question manquante.' }, { status: 400 });
    await store.setJSON(`results/${Date.now()}-${result.id}`, result);
    return Response.json({ ok: true, id: result.id });
  }

  if (request.method === 'GET') {
    if (!(await validSession(request))) return Response.json({ error: 'Non autorisé.' }, { status: 401 });
    const entries = [];
    for await (const item of store.list({ prefix: 'results/' })) {
      const value = await store.get(item.key, { type: 'json' });
      if (value) entries.push(value);
    }
    entries.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return Response.json({ results: entries });
  }
  return new Response('Method Not Allowed', { status: 405 });
};

export const config: Config = { path: '/api/results' };
