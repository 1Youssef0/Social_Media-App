import { GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { genderEnum, HUserDocument, providerEnum, roleEnum } from "../../DB/models/user.model";
import { graphQlUniformResponse } from "../graphQL/types.gql";



export const GraphQLGenderEnum = new GraphQLEnumType({
  name: "GraphQLGenderEnum",
  values: {
    male: { value: genderEnum.male },
    female: { value: genderEnum.female },
  },
});

export const GraphQLProviderEnum = new GraphQLEnumType({
  name: "GraphQLProviderEnum",
  values: {
    google: { value: providerEnum.GOOGLE },
    system: { value: providerEnum.SYSTEM },
  },
});


export const GraphQLRoleEnum = new GraphQLEnumType({
  name: "GraphQLRoleEnum",
  values: {
    superAdmin: { value: roleEnum.superAdmin},
    admin: { value: roleEnum.admin},
    user: { value: roleEnum.user},
  },
});

export const GraphQLOneUserResponse = new GraphQLObjectType({
  name: "OneUserResponse",
  fields: {
    _id: {type:GraphQLID},
   
     //name
     firstName: {type:GraphQLString},
     lastName: {type:GraphQLString},
     userName: {type:GraphQLString , resolve:(parent:HUserDocument)=>{
      return parent.gender === genderEnum.male? `mr::${parent.userName}`:`mis::${parent.userName}`
     }},
     // email
     email: {type:GraphQLString},
     confirmEmailOtp: {type:GraphQLString},
     confirmedAt: {type:GraphQLString},
     //password
     password: {type:GraphQLString},
     resetPasswordOtp: {type:GraphQLString},
     changeCredentialsTime: {type:GraphQLString},
   
     phone: {type:GraphQLString},
     address: {type:GraphQLString},
     profileImage: {type:GraphQLString},
     temProfileImage: {type:GraphQLString},
     coverImages: {type: new GraphQLList(GraphQLString)},
   
     gender: {type:GraphQLGenderEnum},
     role: {type:GraphQLRoleEnum},
     provider: {type:GraphQLProviderEnum},
   
     createAt: {type:GraphQLString},
     updatedAt: {type:GraphQLString},
   
     freezedAt: {type:GraphQLString},
     freezedBy: {type:GraphQLID},
   
     restoredAt: {type:GraphQLString},
     restoredBy: {type:GraphQLID},
     friends: {type:new GraphQLList(GraphQLID)},
  },
});


export const welcome = new GraphQLNonNull(GraphQLString)

export const allUsers = new GraphQLList(GraphQLOneUserResponse)

export const search = graphQlUniformResponse({
          name: "searchUser",
          data: new GraphQLNonNull(GraphQLOneUserResponse),
        })

export const addFollower = new GraphQLList(GraphQLOneUserResponse)        