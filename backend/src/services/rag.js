import OpenAI from 'openai'
import { supabase } from '../db/supabase.js'
import 'dotenv/config'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return res.data[0].embedding
}

export async function retrieveChunks(embedding, politicianId) {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    politician_id: politicianId,
    match_count: 5
  })
  if (error) throw error
  return data
}

export async function callLLM(question, chunks) {
  const context = chunks.map(c => c.content).join('\n\n')
  const prompt = `Answer the question using only the context below. Be concise and cite which parts of the context you used.\n\nContext:\n${context}\n\nQuestion: ${question}`
  
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }]
  })
  return res.choices[0].message.content
}