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

export interface CursorPaginateMeta {
    nextCursor: string | null;
    hasNextPage: boolean;
}

export interface CursorPaginateResponse<T> {
    data: T[];
    meta: CursorPaginateMeta;
}