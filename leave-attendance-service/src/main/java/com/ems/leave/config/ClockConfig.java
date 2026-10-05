package com.ems.leave.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/** A single business clock, so "today" is consistent and tests can pin the date. */
@Configuration(proxyBeanMethods = false)
public class ClockConfig {

    @Bean
    Clock clock(@Value("${ems.zone-id}") String zoneId) {
        return Clock.system(ZoneId.of(zoneId));
    }
}
