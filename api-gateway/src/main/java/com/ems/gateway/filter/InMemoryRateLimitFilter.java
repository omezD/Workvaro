package com.ems.gateway.filter;

import com.ems.gateway.config.GatewayProperties;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window limiter per user (JWT subject) or, failing that, per client IP.
 * In-memory, so it is per gateway instance; swap for the Redis-backed RequestRateLimiter when scaling out.
 */
@Component
public class InMemoryRateLimitFilter implements GlobalFilter, Ordered {

    private static final long WINDOW_MILLIS = 60_000;
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final int limit;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public InMemoryRateLimitFilter(GatewayProperties props) {
        this.limit = props.requestsPerMinute();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return exchange.getPrincipal()
                .map(Principal::getName)
                .switchIfEmpty(Mono.fromSupplier(() -> "ip:" + clientIp(exchange)))
                .flatMap(key -> allow(key) ? chain.filter(exchange) : tooManyRequests(exchange));
    }

    boolean allow(String key) {
        long now = System.currentTimeMillis();
        long windowStart = now - (now % WINDOW_MILLIS);
        if (windows.size() > CLEANUP_THRESHOLD) {
            windows.values().removeIf(w -> w.start < windowStart);
        }
        Window window = windows.compute(key, (k, w) -> w == null || w.start != windowStart ? new Window(windowStart) : w);
        return window.count.incrementAndGet() <= limit;
    }

    private static String clientIp(ServerWebExchange exchange) {
        InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
        return remote != null && remote.getAddress() != null ? remote.getAddress().getHostAddress() : "unknown";
    }

    private static Mono<Void> tooManyRequests(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        response.getHeaders().set("Retry-After", "60");
        byte[] body = "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded, retry later\"}"
                .getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private static final class Window {
        final long start;
        final AtomicInteger count = new AtomicInteger();

        Window(long start) {
            this.start = start;
        }
    }
}
