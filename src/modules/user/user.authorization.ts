import { roleEnum } from "../../DB/models/user.model";

export const endPoint = {
    profile:[roleEnum.user],
    restoreAccount:[roleEnum.admin],
    hardDeleteAccount:[roleEnum.admin],
    dashboard:[roleEnum.admin,roleEnum.superAdmin]
}