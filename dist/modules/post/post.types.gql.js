"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allPosts = exports.GraphQLOnePostResponse = exports.GraphQLAvailabilityEnum = exports.GraphQLAllowCommentsEnum = void 0;
const graphql_1 = require("graphql");
const post_model_1 = require("../../DB/models/post.model");
const user_1 = require("../user");
exports.GraphQLAllowCommentsEnum = new graphql_1.GraphQLEnumType({
    name: "AllowCommentsEnum",
    values: {
        allow: { value: post_model_1.AllowCommentsEnum.allow },
        deny: { value: post_model_1.AllowCommentsEnum.deny },
    }
});
exports.GraphQLAvailabilityEnum = new graphql_1.GraphQLEnumType({
    name: "AvailabilityEnum ",
    values: {
        onlyMe: { value: post_model_1.AvailabilityEnum.onlyMe },
        public: { value: post_model_1.AvailabilityEnum.public },
        friends: { value: post_model_1.AvailabilityEnum.friends },
    }
});
exports.GraphQLOnePostResponse = new graphql_1.GraphQLObjectType({
    name: "OnePostResponse",
    fields: {
        _id: { type: graphql_1.GraphQLID },
        content: { type: graphql_1.GraphQLString },
        attachments: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        assetsFolderId: { type: graphql_1.GraphQLString },
        availability: { type: exports.GraphQLAvailabilityEnum },
        allowComments: { type: exports.GraphQLAllowCommentsEnum },
        likes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        tags: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        createdBy: { type: user_1.GraphQLOneUserResponse },
        freezedAt: { type: graphql_1.GraphQLString },
        freezedBy: { type: graphql_1.GraphQLID },
        restoredAt: { type: graphql_1.GraphQLString },
        restoredBy: { type: graphql_1.GraphQLID },
        createdAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
    }
});
exports.allPosts = new graphql_1.GraphQLObjectType({
    name: "allPosts",
    fields: {
        docsCount: { type: graphql_1.GraphQLInt },
        pages: { type: graphql_1.GraphQLInt },
        currentPage: { type: graphql_1.GraphQLInt },
        limit: { type: graphql_1.GraphQLInt },
        result: { type: new graphql_1.GraphQLList(exports.GraphQLOnePostResponse) },
    }
});
