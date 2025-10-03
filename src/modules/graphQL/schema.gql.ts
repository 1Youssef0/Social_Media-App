import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { userGQLSchema } from "../user";
import { postGQLSchema } from "../post";

const query = new GraphQLObjectType({
  name: "RootSchemaQueryName",
  description: "optional text",
  fields: {
    ...userGQLSchema.registerQuery(),
    ...postGQLSchema.registerQuery(),
  },
});

const mutation = new GraphQLObjectType({
  name: "RootSchemaMutation",
  description: "hold all RootSchemaMutation fields ",
  fields: {
    ...userGQLSchema.registerMutation(),
    ...postGQLSchema.registerMutation(),
  },
});

export const schema = new GraphQLSchema({ query, mutation });
