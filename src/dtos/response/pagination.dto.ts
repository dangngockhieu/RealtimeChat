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