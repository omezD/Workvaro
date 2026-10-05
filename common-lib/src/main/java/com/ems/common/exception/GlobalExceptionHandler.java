package com.ems.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.mapping.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest req) {
        return respond(ex.getStatus(), ex.getMessage(), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fe.getField(), fe.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(ge -> fields.putIfAbsent(ge.getObjectName(), ge.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(ApiError.of(HttpStatus.BAD_REQUEST, "Validation failed", req.getRequestURI(), fields));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> handleConstraint(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getConstraintViolations()
                .forEach(v -> fields.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        return ResponseEntity.badRequest()
                .body(ApiError.of(HttpStatus.BAD_REQUEST, "Validation failed", req.getRequestURI(), fields));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ApiError> handleMethodValidation(HandlerMethodValidationException ex, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, "Validation failed", req);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    ResponseEntity<ApiError> handleBadRequest(Exception ex, HttpServletRequest req) {
        String message = ex instanceof MissingServletRequestParameterException m
                ? "Missing request parameter '" + m.getParameterName() + "'"
                : ex instanceof MethodArgumentTypeMismatchException t
                ? "Invalid value for parameter '" + t.getName() + "'"
                : "Malformed request";
        return respond(HttpStatus.BAD_REQUEST, message, req);
    }

    @ExceptionHandler(PropertyReferenceException.class)
    ResponseEntity<ApiError> handleBadSort(PropertyReferenceException ex, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, "Unknown sort property '" + ex.getPropertyName() + "'", req);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex, HttpServletRequest req) {
        return respond(HttpStatus.UNAUTHORIZED, "Authentication required", req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
        return respond(HttpStatus.FORBIDDEN, "You do not have permission to perform this action", req);
    }

    @ExceptionHandler({NoResourceFoundException.class})
    ResponseEntity<ApiError> handleNotFound(Exception ex, HttpServletRequest req) {
        return respond(HttpStatus.NOT_FOUND, "Resource not found", req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiError> handleMethod(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed", req);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ApiError> handleMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest req) {
        return respond(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported media type", req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Data integrity violation on {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return respond(HttpStatus.CONFLICT, "The request conflicts with existing data", req);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    ResponseEntity<ApiError> handleOptimisticLock(OptimisticLockingFailureException ex, HttpServletRequest req) {
        return respond(HttpStatus.CONFLICT, "The record was modified by someone else, reload and retry", req);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error on {} {}", req.getMethod(), req.getRequestURI(), ex);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", req);
    }

    private static ResponseEntity<ApiError> respond(HttpStatus status, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(ApiError.of(status, message, req.getRequestURI()));
    }
}
