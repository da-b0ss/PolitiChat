import { useState } from 'react'
import { useLazyQuery, gql } from '@apollo/client'

const SEARCH_POLITICIAN = gql`
  query SearchPolitician($name: String!) {
    searchPolitician(name: $name) {
      id
      name
      party
      bio
    }
  }
`

const ASK_QUESTION = gql`
  query AskQuestion($question: String!, $politicianId: ID!) {
    askQuestion(question: $question, politicianId: $politicianId) {
      answer
      sources {
        id
        title
        url
      }
      entities {
        text
        label
      }
    }
  }
`

const ENTITY_COLORS = {
  PERSON: '#dbeafe',
  ORG:    '#dcfce7',
  GPE:    '#fef9c3',
  DATE:   '#ede9fe',
}

export default function App() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [question, setQuestion] = useState('')

  const [searchPoliticians, { data: searchData }] = useLazyQuery(SEARCH_POLITICIAN)
  const [askQuestion, { data: answerData, loading }] = useLazyQuery(ASK_QUESTION)

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif', padding: 20 }}>
      <h1>Politician RAG Chat</h1>

      <input
        placeholder="Search politician..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && searchPoliticians({ variables: { name: search } })}
        style={{ width: '100%', padding: 10, fontSize: 16 }}
      />

      {searchData?.searchPolitician.map(p => (
        <div key={p.id} onClick={() => setSelected(p)}
          style={{ padding: 12, border: '1px solid #ccc', margin: '8px 0', cursor: 'pointer',
            background: selected?.id === p.id ? '#eef' : 'white' }}>
          <strong>{p.name}</strong> — {p.party}
          <p style={{ fontSize: 13, color: '#555' }}>{p.bio?.slice(0, 150)}...</p>
        </div>
      ))}

      {selected && (
        <div style={{ marginTop: 24 }}>
          <h2>Ask about {selected.name}</h2>
          <input
            placeholder="Ask a question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askQuestion({
              variables: { question, politicianId: selected.id }
            })}
            style={{ width: '100%', padding: 10, fontSize: 16 }}
          />

          {loading && <p>Thinking...</p>}

          {answerData?.askQuestion && (
            <div style={{ marginTop: 16 }}>
              <p>{answerData.askQuestion.answer}</p>
              <h4>Sources</h4>
              {answerData.askQuestion.sources.map(s => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                  style={{ display: 'block', color: 'blue', marginBottom: 4 }}>
                  {s.title}
                </a>
              ))}
              {answerData.askQuestion.entities.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Entities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {answerData.askQuestion.entities.map((e, i) => (
                      <span key={i} style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500,
                        background: ENTITY_COLORS[e.label] ?? '#e0e0e0',
                      }}>
                        {e.text}
                        <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{e.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}