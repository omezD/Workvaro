package com.ems.leave.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** Kept off the main class so web-slice tests (@WebMvcTest) don't need a JPA context. */
@Configuration(proxyBeanMethods = false)
@EnableJpaAuditing
public class JpaConfig {
}
