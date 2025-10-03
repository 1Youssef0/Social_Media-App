"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
const graphql_1 = require("graphql");
const user_1 = require("../user");
const post_1 = require("../post");
const query = new graphql_1.GraphQLObjectType({
    name: "RootSchemaQueryName",
    description: "optional text",
    fields: {
        ...user_1.userGQLSchema.registerQuery(),
        ...post_1.postGQLSchema.registerQuery(),
    },
});
const mutation = new graphql_1.GraphQLObjectType({
    name: "RootSchemaMutation",
    description: "hold all RootSchemaMutation fields ",
    fields: {
        ...user_1.userGQLSchema.registerMutation(),
        ...post_1.postGQLSchema.registerMutation(),
    },
});
exports.schema = new graphql_1.GraphQLSchema({ query, mutation });
