import { HTTP_STATUS_CODE } from './http/http-status-codes';

export interface IResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  detailData?: Partial<T>;
  listData?: Partial<T>[];
  total?: number;
}

// create, update, delete, archive
export class ActionSuccessResponse<T> implements IResponse<T> {
  success = true;
  statusCode = HTTP_STATUS_CODE.OK;
  message: string;
  data: Partial<T>;

  /** Accepts options; initializes ActionSuccessResponse and its dependencies. */
  constructor(options: { message: string; data: Partial<T> }) {
    this.message = options.message;
    this.data = options.data;
  }
}

export class DetailSuccessResponse<T> implements IResponse<T> {
  success = true;
  statusCode = HTTP_STATUS_CODE.OK;
  detailData: Partial<T>;

  /** Accepts options; initializes DetailSuccessResponse and its dependencies. */
  constructor(options: { detailData: T }) {
    this.detailData = options.detailData;
  }
}

export class ListSuccessResponse<T> implements IResponse<T> {
  success = true;
  statusCode = HTTP_STATUS_CODE.OK;
  listData: Partial<T>[];
  total: number;

  /** Accepts options; initializes ListSuccessResponse and its dependencies. */
  constructor(options: { listData: T[]; total: number }) {
    this.listData = options.listData;
    this.total = options.total;
  }
}

export class ErrorResponse implements IResponse<null> {
  success = false;
  statusCode: number;
  message: string;

  /** Accepts options; initializes ErrorResponse and its dependencies. */
  constructor(options: { statusCode: number; message: string }) {
    this.statusCode = options.statusCode;
    this.message = options.message;
  }
}
