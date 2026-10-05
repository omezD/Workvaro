package com.ems.gateway.filter;

import com.ems.gateway.config.GatewayProperties;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryRateLimitFilterTest {

    @Test
    void allowsUpToTheLimitPerKeyThenBlocks() {
        InMemoryRateLimitFilter filter = new InMemoryRateLimitFilter(new GatewayProperties(List.of(), 3));

        assertThat(filter.allow("user-a")).isTrue();
        assertThat(filter.allow("user-a")).isTrue();
        assertThat(filter.allow("user-a")).isTrue();
        assertThat(filter.allow("user-a")).isFalse();
        // other callers have their own budget
        assertThat(filter.allow("user-b")).isTrue();
    }
}
