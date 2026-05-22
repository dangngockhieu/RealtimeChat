export interface UserResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginateMeta {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
}

export interface PaginateResponse<T> {
    data: T[];
    meta: PaginateMeta;
}