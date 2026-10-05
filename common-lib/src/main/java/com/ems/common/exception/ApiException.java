package com.ems.common.exception;

import org.springframework.http.HttpStatus;

/** Base class for business exceptions whose message is safe to show to the caller. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException notFound(String entity, Object id) {
        return new ApiException(HttpStatus.NOT_FOUND, entity + " " + id + " not found");
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, message);
    }

    public static ApiException serviceUnavailable(String message) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
