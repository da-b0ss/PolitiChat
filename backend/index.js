import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { typeDefs } from './src/schema/typeDefs.js'
import { resolvers } from './src/resolvers/resolvers.js'
import 'dotenv/config'

const server = new ApolloServer({ typeDefs, resolvers })
const { url } = await startStandaloneServer(server, { listen: { port: 4000 } })
console.log(`Server running at ${url}`)