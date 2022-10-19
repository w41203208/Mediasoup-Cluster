enum ErrorType {
  SFU_ERROR = 'sfuError',
  SERVER_ERROR = 'serverError',
  REQUEST_ERROR = 'requestError',
}

export type ErrorHandlerFunc = (text: string) => void;

export interface ErrorHandler {
  errorHandler: ErrorHandlerFunc;
}
