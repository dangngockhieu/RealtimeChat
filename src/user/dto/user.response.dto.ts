export class UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
}

export class UserValidatorDto extends UserResponseDto {
    password: string;
}