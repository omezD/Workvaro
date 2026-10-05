package com.ems.leave.config;

import com.ems.leave.client.EmployeeClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Configuration;

/** Kept off the main class so web-slice tests (@WebMvcTest) don't try to build Feign clients. */
@Configuration(proxyBeanMethods = false)
@EnableFeignClients(clients = EmployeeClient.class)
public class FeignConfig {
}
