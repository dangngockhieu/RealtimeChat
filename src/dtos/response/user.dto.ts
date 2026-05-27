import { Role } from "../../schemas/user.schema";

export interface UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}