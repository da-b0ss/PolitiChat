import { supabase } from '../db/supabase.js'
import { embedText, retrieveChunks, callLLM } from '../services/rag.js'

export const resolvers = {
  Query: {
    searchPolitician: async (_, { name }) => {
      const { data } = await supabase
        .from('politicians')
        .select('*')
        .ilike('name', `%${name}%`)
      return data
    },

    askQuestion: async (_, { question, politicianId }) => {
      const embedding = await embedText(question)
      const chunks = await retrieveChunks(embedding, politicianId)
      const answer = await callLLM(question, chunks)

      const sourceIds = [...new Set(chunks.map(c => c.source_id))]
      const { data: sources } = await supabase
        .from('sources')
        .select('*')
        .in('id', sourceIds)

      const seen = new Set()
      const entities = []
      for (const chunk of chunks) {
        for (const e of (chunk.entities || [])) {
          const key = `${e.text}:${e.label}`
          if (!seen.has(key)) {
            seen.add(key)
            entities.push(e)
          }
        }
      }

      return { answer, sources, entities }
    }
  }
}