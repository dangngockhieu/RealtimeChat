import { Role } from "../../schemas/user.schema";

export interface UserLogin{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
}

export interface UserAccount {
    id: string;
    email: string;
    role: Role;
}