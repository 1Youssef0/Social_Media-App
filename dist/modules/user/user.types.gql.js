"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFollower = exports.search = exports.allUsers = exports.welcome = exports.GraphQLOneUserResponse = exports.GraphQLRoleEnum = exports.GraphQLProviderEnum = exports.GraphQLGenderEnum = void 0;
const graphql_1 = require("graphql");
const user_model_1 = require("../../DB/models/user.model");
const types_gql_1 = require("../graphQL/types.gql");
exports.GraphQLGenderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLGenderEnum",
    values: {
        male: { value: user_model_1.genderEnum.male },
        female: { value: user_model_1.genderEnum.female },
    },
});
exports.GraphQLProviderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLProviderEnum",
    values: {
        google: { value: user_model_1.providerEnum.GOOGLE },
        system: { value: user_model_1.providerEnum.SYSTEM },
    },
});
exports.GraphQLRoleEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQLRoleEnum",
    values: {
        superAdmin: { value: user_model_1.roleEnum.superAdmin },
        admin: { value: user_model_1.roleEnum.admin },
        user: { value: user_model_1.roleEnum.user },
    },
});
exports.GraphQLOneUserResponse = new graphql_1.GraphQLObjectType({
    name: "OneUserResponse",
    fields: {
        _id: { type: graphql_1.GraphQLID },
        firstName: { type: graphql_1.GraphQLString },
        lastName: { type: graphql_1.GraphQLString },
        userName: { type: graphql_1.GraphQLString, resolve: (parent) => {
                return parent.gender === user_model_1.genderEnum.male ? `mr::${parent.userName}` : `mis::${parent.userName}`;
            } },
        email: { type: graphql_1.GraphQLString },
        confirmEmailOtp: { type: graphql_1.GraphQLString },
        confirmedAt: { type: graphql_1.GraphQLString },
        password: { type: graphql_1.GraphQLString },
        resetPasswordOtp: { type: graphql_1.GraphQLString },
        changeCredentialsTime: { type: graphql_1.GraphQLString },
        phone: { type: graphql_1.GraphQLString },
        address: { type: graphql_1.GraphQLString },
        profileImage: { type: graphql_1.GraphQLString },
        temProfileImage: { type: graphql_1.GraphQLString },
        coverImages: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        gender: { type: exports.GraphQLGenderEnum },
        role: { type: exports.GraphQLRoleEnum },
        provider: { type: exports.GraphQLProviderEnum },
        createAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
        freezedAt: { type: graphql_1.GraphQLString },
        freezedBy: { type: graphql_1.GraphQLID },
        restoredAt: { type: graphql_1.GraphQLString },
        restoredBy: { type: graphql_1.GraphQLID },
        friends: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
    },
});
exports.welcome = new graphql_1.GraphQLNonNull(graphql_1.GraphQLString);
exports.allUsers = new graphql_1.GraphQLList(exports.GraphQLOneUserResponse);
exports.search = (0, types_gql_1.graphQlUniformResponse)({
    name: "searchUser",
    data: new graphql_1.GraphQLNonNull(exports.GraphQLOneUserResponse),
});
exports.addFollower = new graphql_1.GraphQLList(exports.GraphQLOneUserResponse);
