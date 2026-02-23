export const typeDefs = `#graphql
  type Politician {
    id: ID!
    name: String!
    party: String
    bio: String
  }

  type Source {
    id: ID!
    title: String!
    url: String
  }

  type Answer {
    answer: String!
    sources: [Source!]!
  }

  type Query {
    searchPolitician(name: String!): [Politician!]!
    askQuestion(question: String!, politicianId: ID!): Answer!
  }
`