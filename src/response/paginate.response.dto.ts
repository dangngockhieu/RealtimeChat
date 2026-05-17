export class PaginateResponse<T> {
    data: T[];
    meta: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
        totalItems: number;
    };
}